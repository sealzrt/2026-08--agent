# 第 4 章：权限管线 - Agent 的护栏

原课程对应：`第一部分-基础篇/04-权限管线-Agent的护栏.md`

> 工具系统给了 Agent 行动能力，权限管线决定这些行动能不能发生、在什么范围内发生、由谁确认、是否需要持久化规则。

## 学习目标

读完本章后，你应该能够：

- 理解权限管线不是单点检查，而是多阶段决策流程。
- 说清 `validateInput`、`hasPermissionsToUseTool`、`checkPermissions` 和用户确认各自负责什么。
- 理解 `PermissionContext` 为什么需要携带工具、环境、来源和决策信息。
- 区分 default、plan、auto、bypassPermissions、bubble 等权限模式。
- 理解 BashTool 权限为什么比普通工具更复杂。
- 掌握权限更新和持久化在项目级安全配置中的作用。

## 4.1 权限管线的四个阶段

权限管线的核心思想是分层防御。一个工具调用从模型产生到真正执行，中间至少要经过参数、规则、上下文和用户确认等多个关口。

先看完整决策路径：

```mermaid
flowchart TD
  A[模型产生 tool_use] --> B[阶段 1<br/>validateInput<br/>参数 Schema 验证]
  B --> C{参数是否合法?}
  C -->|否| C1[拒绝：参数错误<br/>回填给模型修正]
  C -->|是| D[阶段 2<br/>hasPermissionsToUseTool<br/>静态规则匹配]
  D --> E{命中明确 allow / deny?}
  E -->|deny| E1[拒绝：规则禁止]
  E -->|allow| H[允许执行]
  E -->|未命中| F[阶段 3<br/>checkPermissions<br/>上下文风险评估]
  F --> G{能否自动决策?}
  G -->|自动允许| H
  G -->|自动拒绝| G1[拒绝：上下文风险]
  G -->|需要确认| I[阶段 4<br/>交互式提示<br/>用户确认]
  I --> J{用户选择}
  J -->|允许一次/持久允许| H
  J -->|拒绝| J1[拒绝：用户不同意]
  H --> K[执行工具]
  K --> L[tool_result 回填 messages]

  classDef stage1 fill:#E8F3FF,stroke:#2563EB,color:#111827
  classDef stage2 fill:#ECFDF3,stroke:#16A34A,color:#111827
  classDef stage3 fill:#FFF7ED,stroke:#EA580C,color:#111827
  classDef stage4 fill:#FDF2F8,stroke:#DB2777,color:#111827
  classDef allow fill:#F0FDF4,stroke:#16A34A,color:#111827
  classDef deny fill:#FEF2F2,stroke:#DC2626,color:#111827
  class B stage1
  class D stage2
  class F stage3
  class I stage4
  class H,K,L allow
  class C1,E1,G1,J1 deny
```

这张图的重点是：权限管线不是一个 `if allowed then run`，而是一组从低成本到高成本的判断。越早能拒绝或允许，越不需要进入后面的复杂判断。

也可以把它压缩理解为：

```text
模型提出工具调用
  -> 阶段一：参数 schema 验证
  -> 阶段二：静态规则匹配
  -> 阶段三：上下文评估
  -> 阶段四：用户确认或自动决策
  -> 执行或拒绝
```

每一层解决的问题不同。前一层越早拦截，后面的风险和成本越低。

四个阶段的职责边界如下：

```mermaid
flowchart LR
  S1[阶段 1<br/>参数是否合法?] --> S2[阶段 2<br/>规则是否明确?]
  S2 --> S3[阶段 3<br/>结合上下文是否安全?]
  S3 --> S4[阶段 4<br/>是否需要用户决定?]
  S4 --> R[执行或拒绝]

  classDef stage1 fill:#E8F3FF,stroke:#2563EB,color:#111827
  classDef stage2 fill:#ECFDF3,stroke:#16A34A,color:#111827
  classDef stage3 fill:#FFF7ED,stroke:#EA580C,color:#111827
  classDef stage4 fill:#FDF2F8,stroke:#DB2777,color:#111827
  class S1 stage1
  class S2 stage2
  class S3 stage3
  class S4 stage4
```

| 阶段 | 只回答什么问题 | 不负责什么 |
|------|----------------|------------|
| `validateInput` | 参数格式对不对 | 不判断是否安全 |
| `hasPermissionsToUseTool` | 是否命中已有 allow / deny 规则 | 不做复杂语义分析 |
| `checkPermissions` | 结合工具输入、目录、模式、Hook 等上下文是否可执行 | 不代替用户做所有高风险决定 |
| 交互式提示 | 系统无法自动确定时，让用户明确决策 | 不应该频繁打断低风险动作 |

### 4.1.1 阶段一：validateInput - Zod Schema 验证

第一阶段是输入验证。

模型生成的工具参数不能直接信任。即使模型“看起来懂工具”，它仍可能传错类型、漏掉必填字段、传入超出范围的值，或构造出工具无法处理的结构。

`validateInput` 的职责是：

- 检查工具参数是否符合 schema。
- 拒绝缺失字段、类型错误、非法枚举值。
- 把非结构化模型输出变成可靠的工具输入。

这一层不讨论“是否允许执行”，只讨论“这个请求是否格式正确”。这是权限管线的地基。参数不合法时，不应该进入更昂贵的权限判断。

### 4.1.2 阶段二：hasPermissionsToUseTool - 规则匹配

第二阶段是规则匹配。

这一层检查当前工具调用是否命中已有允许或拒绝规则。例如：

- 某个工具是否被禁用。
- 某个命令前缀是否被允许。
- 某个路径是否禁止写入。
- 当前模式是否允许使用此工具。

它更偏静态判断：根据工具名、输入参数、配置规则和权限列表快速得出初步结果。

这里的关键是“先看规则，再问用户”。如果某个动作已经被明确拒绝，就不应该再弹窗让用户确认；如果某个动作已经被项目规则明确允许，也不必每次打断用户。

### 4.1.3 阶段三：checkPermissions - 上下文评估

第三阶段是上下文评估。

有些权限不能只靠工具名判断。例如同样是 BashTool：

```text
ls src
rm -rf /
git status
npm test
curl internal-api
```

这些命令都走 BashTool，但风险完全不同。

`checkPermissions` 需要结合更多上下文：

- 当前权限模式。
- 工具输入内容。
- 项目目录和工作区。
- 用户配置和项目配置。
- 历史权限决策。
- Hook 或分类器返回的判断。
- 子智能体是否需要向父级冒泡权限。

这层的价值是把“工具级权限”细化为“动作级权限”。

### 4.1.4 阶段四：交互式提示 - 用户确认

第四阶段是用户确认。

当系统无法自动判断，或动作风险较高时，需要把决策交给用户。用户确认不是权限系统的全部，但它是处理不确定风险的重要层。

一个好的确认提示应该说明：

- 哪个工具要执行。
- 具体参数是什么。
- 可能产生什么影响。
- 是只允许一次，还是允许类似操作。
- 是否要写入持久化规则。

交互式提示的设计目标不是频繁打扰用户，而是在关键风险点给用户明确控制权。

## 4.2 PermissionContext 的设计

权限决策不能只看工具名。它需要上下文。

`PermissionContext` 可以理解为权限管线的“案卷”：一次工具调用进入权限系统时，所有判断需要的信息都应该装在这个上下文里。

```mermaid
flowchart TD
  A[一次工具调用] --> C[PermissionContext<br/>权限判断案卷]
  C --> T[工具名称<br/>例如 Bash / Read / Write]
  C --> I[工具输入<br/>命令、路径、参数]
  C --> W[工作目录<br/>项目边界]
  C --> M[权限模式<br/>default / plan / auto / bubble]
  C --> U[用户规则<br/>个人允许/拒绝]
  C --> P[项目规则<br/>团队安全约定]
  C --> H[Hook 结果<br/>外部策略]
  C --> S[子智能体来源<br/>是否需要冒泡]
  C --> D[最终权限决策]

  classDef context fill:#F5F3FF,stroke:#7C3AED,color:#111827
  classDef input fill:#E8F3FF,stroke:#2563EB,color:#111827
  classDef rule fill:#ECFDF3,stroke:#16A34A,color:#111827
  classDef decision fill:#FFF7ED,stroke:#EA580C,color:#111827
  class C context
  class T,I,W,M,S input
  class U,P,H rule
  class D decision
```

读图结论：权限判断不是只看工具名。`Read(src/index.ts)`、`Read(.env)`、`Bash(git status)`、`Bash(rm -rf dist)` 都可能是不同风险，因为输入、目录、规则和模式不同。

### 4.2.1 ToolPermissionContext 类型结构

一个完整的工具权限上下文通常需要包含：

| 信息 | 作用 |
|------|------|
| 工具名称 | 判断是哪类能力 |
| 工具输入 | 判断具体动作风险 |
| 工作目录 | 限定路径和项目边界 |
| 权限模式 | 决定默认策略 |
| 用户规则 | 应用个人偏好 |
| 项目规则 | 应用项目安全约定 |
| Hook 结果 | 接入外部策略 |
| 子智能体来源 | 判断是否需要冒泡 |

这里的重点是：权限判断不是孤立函数，而是围绕上下文做决策。

### 4.2.2 PermissionDecision 的来源：hook、user、classifier

权限决策可能来自不同来源。

| 来源 | 特点 |
|------|------|
| hook | 外部脚本或生命周期扩展点给出的判断 |
| user | 用户通过交互式提示做出的选择 |
| classifier | 系统或模型分类器对风险的自动判断 |

不同来源的可信度和适用场景不同。

Hook 适合企业策略或项目规则，例如禁止访问某些路径。用户适合处理一次性高风险动作。分类器适合在 auto 模式下降低确认频率，但分类器结果不能替代硬性安全边界。

### 4.2.3 ResolveOnce 模式：原子化的竞争解决

权限决策可能存在竞争。例如用户确认、Hook 返回、分类器判断、超时逻辑可能都在等待结果。

`ResolveOnce` 模式的目标是：一次权限请求只能被解决一次。

```text
多个来源竞争产生决策
  -> 第一个有效决策生效
  -> 后续结果被忽略
  -> 避免重复执行或重复提示
```

这对交互式 Agent 很重要。否则可能出现用户刚拒绝，另一个异步分支又批准；或者同一工具调用被执行两次。

## 4.3 权限模式谱系

权限模式决定 Agent 默认如何处理工具调用。不同模式对应不同自动化程度和风险边界。

先用一条坐标轴理解：

```mermaid
flowchart LR
  P[plan<br/>只读优先<br/>适合先分析] --> D[default<br/>逐次确认<br/>适合普通使用]
  D --> A[auto<br/>低风险自动批准<br/>依赖规则和分类器]
  A --> B[bubble<br/>子智能体权限上交<br/>父级决策]
  B --> X[bypassPermissions<br/>跳过常规权限<br/>风险最高]

  classDef low fill:#ECFDF3,stroke:#16A34A,color:#111827
  classDef normal fill:#E8F3FF,stroke:#2563EB,color:#111827
  classDef auto fill:#FFF7ED,stroke:#EA580C,color:#111827
  classDef bubble fill:#FDF2F8,stroke:#DB2777,color:#111827
  classDef high fill:#FEF2F2,stroke:#DC2626,color:#111827
  class P low
  class D normal
  class A auto
  class B bubble
  class X high
```

```text
更保守 / 更适合分析  --------------------------------  更自动化 / 更高风险
```

| 模式 | 自动化程度 | 风险倾向 | 适合场景 |
|------|------------|----------|----------|
| `plan` | 低 | 低 | 先读代码、做计划、减少写操作 |
| `default` | 中 | 中 | 普通开发，风险动作逐次确认 |
| `auto` | 较高 | 中高 | 规则成熟、低风险动作自动化 |
| `bubble` | 取决于父级 | 中 | 子智能体把权限请求交给主 Agent |
| `bypassPermissions` | 最高 | 最高 | 隔离沙箱或用户明确承担风险 |

注意：`bubble` 不是简单比 `auto` 更危险，它是多智能体场景下的权限上交机制。把它放在谱系中，是为了提醒读者它会改变“谁来做最终决策”。

### 4.3.1 default 模式：逐次确认

default 模式偏保守。对于有风险或未明确允许的动作，系统会逐次询问用户。

适合：

- 新项目。
- 不熟悉的仓库。
- 权限规则尚未建立。
- 用户希望保持强控制。

缺点是确认频率较高，自动化体验较弱。

### 4.3.2 plan 模式：只读为主

plan 模式强调先理解和规划，减少修改性动作。

在这个模式下，Agent 更适合读取文件、搜索代码、分析结构、提出计划，而不是直接写文件或执行高风险命令。

它的价值是把“想清楚”和“动手改”分开。复杂任务中，先进入 plan 模式可以降低误操作概率。

### 4.3.3 auto 模式：自动审批（带分类器）

auto 模式试图减少交互确认，让系统根据规则或分类器自动批准低风险动作。

适合：

- 用户已经信任项目规则。
- 任务重复且风险可控。
- 需要较强自动化。

但 auto 不等于无限制。分类器可能误判，因此仍需要硬性拒绝规则、路径边界和沙箱保护。

### 4.3.4 bypassPermissions 模式：完全跳过

bypassPermissions 是最高风险模式。它跳过常规权限检查，让 Agent 更自由地执行动作。

这个模式只适合高度受控环境，例如临时实验、沙箱项目或用户明确承担风险的场景。

学习时要记住：bypass 不是更高级的 auto，而是主动关闭护栏。它应该被清楚标记、谨慎使用，并尽量限制在隔离环境里。

### 4.3.5 bubble 模式：子智能体权限冒泡

bubble 模式用于 Subagent 场景。

子智能体遇到需要确认的动作时，不应该自己随意决定，而是把权限请求冒泡给父级或主 Agent，由更高层上下文做判断。

这解决两个问题：

- 子 Agent 上下文不完整，可能不知道全局风险。
- 主 Agent 需要保持对关键动作的控制权。

## 4.4 BashTool 的权限细节

BashTool 是权限系统最复杂的工具之一，因为它本身是通用命令执行入口。

同一个 BashTool 可以执行安全命令，也可以执行高风险命令。因此 Bash 权限不能只看工具名，必须看命令语义。

可以先看 Bash 权限决策树：

```mermaid
flowchart TD
  A[Bash 命令] --> B{是否包含复杂 Shell 结构?}
  B -->|是：管道/重定向/变量/子命令/逻辑操作符| C[提高风险等级<br/>保守解析]
  B -->|否| D[提取命令前缀]
  C --> D
  D --> E{命中 deny 规则?}
  E -->|是| R[拒绝执行]
  E -->|否| F{命中 allow 规则?}
  F -->|是| L[允许或低风险确认]
  F -->|否| G{auto 模式下分类器判断低风险?}
  G -->|是| L
  G -->|否| U[请求用户确认]
  U --> H{用户是否允许?}
  H -->|是| L
  H -->|否| R

  classDef risk fill:#FFF7ED,stroke:#EA580C,color:#111827
  classDef allow fill:#ECFDF3,stroke:#16A34A,color:#111827
  classDef deny fill:#FEF2F2,stroke:#DC2626,color:#111827
  class C,G,U risk
  class L allow
  class R deny
```

读图结论：Bash 权限不是简单匹配字符串。复杂 Shell 结构会提高风险，明确拒绝规则优先于自动审批，分类器只能辅助低风险判断，不能覆盖硬性拒绝规则。

### 4.4.1 命令分类与通配符匹配

命令分类用于判断 Bash 命令属于哪类动作：

- 只读查看，例如 `ls`、`cat`、`git status`。
- 构建测试，例如 `npm test`、`mvn test`。
- 修改文件，例如 `sed -i`、`rm`、`mv`。
- 网络访问，例如 `curl`、`wget`。
- 系统级操作，例如修改权限、安装软件。

通配符匹配用于表达规则。例如：

```text
允许 npm test *
拒绝 rm -rf *
允许 git status
```

通配符越宽，风险越高。`npm *` 比 `npm test` 风险大得多，因为它可能包含 install、publish、run script 等不同动作。

### 4.4.2 前缀提取规则

Bash 命令的权限规则经常基于前缀。

例如：

```text
git status --short
```

可以提取前缀为：

```text
git status
```

这样用户允许一次 `git status` 后，类似状态查询命令可以复用规则。

但前缀提取必须保守。Shell 命令可能包含管道、重定向、变量、子命令和逻辑操作符。简单字符串切分容易误判风险。

因此 Bash 权限通常需要命令解析和语义判断，而不是只做文本前缀匹配。

### 4.4.3 分类器自动审批机制

auto 模式下，分类器可以辅助判断命令风险。

例如它可以识别：

- 这是只读查询。
- 这是测试命令。
- 这是修改文件。
- 这是高风险删除。

但分类器只能降低确认成本，不能替代硬规则。明确拒绝的命令不应被分类器放行；越界路径也不应因为分类器判断低风险而绕过。

合理顺序是：

```text
硬性拒绝规则
  -> 显式允许规则
  -> 分类器判断
  -> 用户确认
```

## 4.5 权限更新与持久化

权限系统如果每次都问用户，会很烦。如果每次都自动放行，又很危险。

权限更新和持久化就是在两者之间建立平衡：用户可以把一次确认转化为稳定规则，但这个过程必须明确可见。

### 4.5.1 PermissionUpdate 模式

`PermissionUpdate` 可以理解为一次权限规则变更请求。

常见模式包括：

- 只允许本次。
- 允许当前命令前缀。
- 允许当前工具。
- 拒绝当前工具。
- 写入用户级规则。
- 写入项目级规则。

这里的重点是作用域。允许一次和永久允许是完全不同的风险；用户级规则和项目级规则也会影响不同范围。

### 4.5.2 applyPermissionUpdates 与 persistPermissionUpdates

权限更新通常分两步：

1. `applyPermissionUpdates`：把规则应用到当前运行时。
2. `persistPermissionUpdates`：把规则写入配置文件，供后续会话继续使用。

这两个步骤必须区分。

有些确认只应该在当前会话生效，不应该写盘。有些项目约定则需要持久化到项目配置中，让团队共享。

自研 Harness 时，也应该明确区分“临时权限”和“持久权限”。

## 实战练习：配置项目级权限系统

### 练习 1：配置项目级 `.claude/settings.json`

为一个项目设计基础权限配置：

- 默认允许只读搜索工具。
- 默认允许 `git status`、`git diff`。
- 修改文件需要确认。
- 删除文件需要明确拒绝或强确认。
- 网络请求需要确认。

思考：哪些规则应该放到项目级，哪些应该留在用户级？

### 练习 2：更精细的通配符控制

比较以下规则风险：

```text
allow: npm test
allow: npm run test:*
allow: npm *
```

说明为什么通配符越宽，权限风险越高。

### 练习 3：企业级安全配置模板

设计一个企业项目权限模板：

- 禁止访问密钥文件。
- 禁止执行部署命令。
- 禁止访问内网敏感域名。
- 允许只读代码搜索。
- 允许测试命令，但禁止发布命令。

重点不是规则语法，而是安全边界是否明确。

### 练习 4：权限决策流的情景分析

分析下面场景应该如何决策：

1. Agent 请求读取 `src/index.ts`。
2. Agent 请求写入 `src/index.ts`。
3. Agent 请求执行 `rm -rf dist`。
4. Agent 请求执行 `git status --short`。
5. 子智能体请求修改配置文件。

对每个场景说明会经过哪些权限阶段，最终应允许、拒绝、确认还是冒泡。

## 关键要点总结

1. 权限管线是多阶段流程，不是单个 allow/deny 判断。

2. `validateInput` 解决参数合法性，`hasPermissionsToUseTool` 解决规则匹配，`checkPermissions` 解决上下文评估，交互式提示解决不确定风险。

3. `PermissionContext` 让权限判断具备环境感知能力。工具名、输入参数、工作目录、权限模式、Hook、用户规则和子智能体来源都可能影响决策。

4. 权限模式是一条自动化谱系。default 更保守，plan 偏只读，auto 更自动化，bypass 风险最高，bubble 用于子智能体权限上交。

5. BashTool 权限最复杂，因为它是通用命令执行入口。命令分类、通配符匹配、前缀提取和分类器判断都必须保守设计。

6. 权限更新要区分临时应用和持久化写入。一次允许不等于永久允许，用户级规则也不等于项目级规则。

7. Agent 越能行动，权限越要前置。成熟 Harness 应该在工具可见性、参数校验、规则匹配、上下文评估、用户确认和持久化规则中形成闭环。

下一章会进入设置与配置系统。权限规则不是孤立存在的，它们需要通过配置系统在用户、项目和会话之间组织起来。

## 4.6 关键流程图补强

### 图 1：四阶段权限管线

```mermaid
flowchart LR
  A[工具请求] --> B[validateInput]
  B --> C[hasPermissionsToUseTool]
  C --> D[checkPermissions]
  D --> E[交互式确认]
  E --> F[执行或拒绝]
```

### 图 2：权限模式谱系

```text
plan      : 只读优先，写操作受限
default   : 高风险动作逐次确认
auto      : 低风险动作可自动批准
bubble    : 子智能体权限上交父级
bypass    : 跳过权限，风险最高
```

### 图 3：Bash 前缀匹配流程

```mermaid
flowchart TD
  A[Bash 命令] --> B[解析命令前缀]
  B --> C[匹配 allow / deny 规则]
  C --> D{命中 deny}
  D -- 是 --> E[拒绝]
  D -- 否 --> F{命中 allow}
  F -- 是 --> G[允许或低风险确认]
  F -- 否 --> H[分类器或用户确认]
```

### 图 4：hook / user / classifier 决策竞争

```text
权限请求
  -> Hook 可以提前允许或拒绝
  -> Classifier 可以给低风险建议
  -> User 是不确定风险的最终确认者
  -> ResolveOnce 确保只采纳第一个有效决策
```

这张图的重点是：权限决策不是投票系统，而是有优先级和原子解决规则的竞争过程。

### 图 5：权限与安全总图

```mermaid
flowchart TD
  A[模型提出动作] --> B[工具可见性过滤]
  B --> C[参数 Schema 校验]
  C --> D[权限规则匹配]
  D --> E[PermissionContext 上下文评估]
  E --> F[Hook 安全策略]
  F --> G{是否需要用户确认}
  G -- 是 --> H[用户批准 / 拒绝]
  G -- 否 --> I[自动允许或拒绝]
  H --> J[审计日志]
  I --> J
  J --> K[执行或阻断]
  K --> L[权限更新是否持久化]
```

这张图把第 4 章和后续章节连起来：

- 工具可见性来自第 3 章工具系统。
- 权限规则来源和持久化依赖第 5 章配置系统。
- Hook 安全策略来自第 8 章钩子系统。
- 子智能体权限冒泡对应第 9 章。
- MCP 工具也必须进入同一条权限路径，对应第 12 章。

### 图 6：安全失败恢复图

```text
权限拒绝
  -> 记录拒绝原因
  -> 回填给对话循环
  -> 模型调整方案
  -> 如果多次重复请求同类危险动作
  -> 触发更强阻断或要求用户明确决策
```

安全系统不是只负责“挡住”。它还要把拒绝原因变成模型可理解的反馈，让 Agent 有机会换一条安全路径。
