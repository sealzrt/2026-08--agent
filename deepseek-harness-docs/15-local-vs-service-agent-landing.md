# 本地 Agent 工具与服务 Agent 接口落地方案

> 目标：区分 DeepSeek Harness 在两类业务形态里的落地方式，并理解服务化 Agent 如何处理多用户隔离、并发、暂停恢复和工具权限。

这篇解决三个问题：

1. 本地 Agent 工具和服务 Agent 接口分别适合什么场景？
2. 两种形态的技术方案分别是什么？
3. 服务 Agent 面对多用户并发时，如何隔离上下文、权限和任务状态？

---

## 1. 先用一句话区分

```text
本地 Agent 工具：Agent 在某台机器上运行，主要操作本地文件、命令、项目和脚本。
服务 Agent 接口：Agent 作为后端服务运行，给多个用户、多个系统提供 API 能力。
```

两者共享的核心能力类似：

- Agent 会组织上下文。
- Agent 会调用 LLM。
- Agent 会调用 Tool。
- Agent 会记录过程。
- Agent 可以遇到人工确认后暂停。

但它们的工程重点完全不同：

| 形态 | 重点 | 典型问题 |
|------|------|----------|
| 本地 Agent 工具 | 本机权限、工作区、命令安全、工具白名单 | 能不能读这个文件？能不能跑这个命令？会不会误删本地项目？ |
| 服务 Agent 接口 | 多用户隔离、状态持久化、任务队列、权限校验、审计 | 用户 A 会不会看到用户 B 的上下文？审核任务会不会被重复处理？ |

先看总图：

```mermaid
flowchart TD
  A[DeepSeek Harness 落地] --> B[本地 Agent 工具]
  A --> C[服务 Agent 接口]

  B --> B1[本机进程]
  B --> B2[本地文件/命令/Git/脚本]
  B --> B3[工作区权限和审批]

  C --> C1[API 服务]
  C --> C2[Session/Task/Event 存储]
  C --> C3[Worker Pool]
  C --> C4[业务系统工具]
  C --> C5[多用户隔离和审计]
```

---

## 2. 本地 Agent 工具方案

本地 Agent 工具适合这些场景：

- 代码助手：读项目、改文件、跑测试、生成提交说明。
- 本地运维：读取日志、执行脚本、生成巡检报告。
- 桌面自动化：处理本地文档、表格、截图、浏览器页面。
- 内网机器助手：在一台固定服务器上处理某类任务。

它的核心形态是：

```text
一个用户
  -> 一个本地 Agent 进程
  -> 操作当前工作区或本机资源
```

### 2.1 本地架构

```mermaid
flowchart LR
  U[本地用户] --> CLI[CLI / Desktop UI / Local Web]
  CLI --> R[Agent Runner]
  R --> M[LLM Client]
  R --> T[Local Tools]
  T --> F[文件系统]
  T --> S[Shell 命令]
  T --> G[Git 仓库]
  T --> B[浏览器/本地脚本]
  R --> E[本地事件日志]
  R --> C[本地 checkpoint]
```

这里的 `Agent Runner` 可以理解为执行 Turn 循环的地方。

它会：

1. 读取用户输入。
2. 加载当前工作区上下文。
3. 调用模型。
4. 根据模型输出调用本地工具。
5. 把结果写回用户界面。
6. 必要时保存事件和 checkpoint。

### 2.2 本地 Turn 怎么跑

```mermaid
sequenceDiagram
  participant U as 本地用户
  participant UI as CLI/本地页面
  participant R as Agent Runner
  participant M as LLM
  participant T as 本地工具
  participant FS as 工作区

  U->>UI: 输入任务
  UI->>R: 创建本地 session
  R->>FS: 读取必要文件和上下文
  R->>M: 发送任务和上下文
  M-->>R: 返回下一步计划或工具调用
  R->>T: 调用本地工具
  T->>FS: 读写文件或执行命令
  FS-->>T: 返回结果
  T-->>R: 返回工具结果
  R-->>UI: 流式输出进度和结果
  UI-->>U: 展示结果
```

### 2.3 本地工具要怎么控制风险

本地 Agent 最大风险是“它能操作你的机器”。

所以工具设计要保守：

| 风险点 | 控制方式 |
|--------|----------|
| 误删文件 | 限制工作区，禁止默认执行破坏性命令 |
| 随意执行命令 | 命令白名单、审批、沙箱 |
| 读取敏感目录 | 只允许读取项目目录或配置目录 |
| 修改用户未授权文件 | 写入前展示 diff 或确认 |
| 网络访问不可控 | 按域名或命令前缀限制 |
| 上下文过大 | 只读取必要文件，不把整个项目塞给模型 |

### 2.4 本地状态怎么存

本地场景可以简单一些：

```text
.agent/
  sessions/
    session_001.json
  events/
    session_001.events.jsonl
  checkpoints/
    task_001.json
```

MVP 阶段甚至可以只保存：

- 当前 session
- 用户输入
- 工具调用记录
- 最终结果

但如果要支持暂停恢复，就应该保存 checkpoint。

---

## 3. 服务 Agent 接口方案

服务 Agent 接口适合这些场景：

- 客服工单分派。
- 审批流辅助。
- 合同审查。
- 企业知识库问答 + 系统操作。
- OA / CRM / ERP 自动化。
- 多用户同时访问的业务平台。

它的核心形态是：

```text
多个用户 / 多个业务系统
  -> Agent API 服务
  -> Task/Event/Checkpoint 数据库
  -> Worker Pool 执行 Agent
  -> 业务工具服务
```

### 3.1 服务端架构

```mermaid
flowchart TD
  U1[用户 A] --> API[Agent API]
  U2[用户 B] --> API
  R1[审核员] --> ReviewUI[审核员页面]
  ReviewUI --> API

  API --> DB[(Session/Task/Event DB)]
  API --> Q[Job Queue]
  Q --> W1[Agent Worker 1]
  Q --> W2[Agent Worker 2]
  Q --> W3[Agent Worker 3]

  W1 --> DB
  W2 --> DB
  W3 --> DB

  W1 --> LLM[LLM Service]
  W2 --> LLM
  W3 --> LLM

  W1 --> Tools[Business Tools]
  W2 --> Tools
  W3 --> Tools

  Tools --> Ticket[工单系统]
  Tools --> CRM[CRM]
  Tools --> Notify[通知服务]
  Tools --> Audit[审计系统]
```

这里有几个关键点：

- `API` 负责接收请求、鉴权、创建 session/task/event。
- `DB` 保存状态，不依赖进程内存。
- `Queue` 负责异步调度。
- `Worker Pool` 并发执行多个 task。
- `Tools` 封装业务系统能力。

### 3.2 服务端请求不是一次 req/res

服务 Agent 不应该理解成：

```text
用户请求 -> Agent 一次性返回最终结果
```

应该理解成：

```text
用户请求 -> 创建 task -> 返回 task_id
Worker 异步处理 -> 不断更新状态
前端通过 SSE/WebSocket/轮询看到进度
```

```mermaid
sequenceDiagram
  participant U as 用户
  participant UI as Web UI
  participant API as Agent API
  participant DB as DB
  participant Q as Job Queue
  participant W as Agent Worker
  participant Tool as 业务工具

  U->>UI: 提交问题
  UI->>API: POST /api/sessions
  API->>DB: 创建 session/task/event
  API->>Q: 投递 agent_job(task_id)
  API-->>UI: 返回 task_id 和 pending 状态
  UI-->>U: 展示处理中

  Q-->>W: 分配 task_id
  W->>DB: 加载 task/session/events
  W->>Tool: 调用业务工具
  Tool-->>W: 返回工具结果
  W->>DB: 写 event/status/checkpoint
  UI->>API: 查询 task 状态
  API->>DB: 读取最新状态
  API-->>UI: 返回处理中或完成
```

### 3.3 Business Tool 不是一定是 MCP 服务

这是最容易混淆的一点。

先记住这句：

```text
Business Tool 是能力抽象
MCP / HTTP / 本地插件 是暴露能力的方式
```

也就是说，Tool 讲的是“Agent 能做什么”，MCP 讲的是“这个能力怎么被访问”。

```mermaid
flowchart TD
  A[Business Tool 能力] --> B[本地插件]
  A --> C[MCP 服务]
  A --> D[HTTP API]

  B --> B1[CLI / Desktop / Local Agent]
  C --> C1[标准化工具协议]
  D --> D1[业务系统 REST / RPC 接口]
```

### 3.3.1 三种常见实现方式

| 方式 | 适合谁 | 特点 |
|------|--------|------|
| 本地插件 | 本地 Agent、代码助手、桌面自动化 | 直接在当前进程或本机调用，延迟低，部署简单 |
| MCP 服务 | 想让多个客户端复用同一套工具能力 | 用统一协议暴露工具，适合标准化接入 |
| HTTP API | 已经有业务系统，想快速接 Agent | 最容易接企业系统，通常最常见 |

### 3.3.2 什么时候用 MCP

MCP 更适合这几类情况：

- 工具能力想被多个 Agent 客户端复用。
- 想把工具暴露成标准协议，而不是每个客户端写一套适配器。
- 工具背后是独立服务，不想把业务逻辑绑死在某个本地插件里。

如果是下面这种情况，MCP 不是必须的：

- 只是本地 Agent 调一个本机脚本。
- 只是服务 Agent 调自己业务系统的 REST API。
- 只是想先把 MVP 跑通。

### 3.3.3 实现关系图

```mermaid
sequenceDiagram
  participant A as Agent
  participant T as Business Tool
  participant L as Local Plugin
  participant M as MCP Server
  participant H as HTTP API

  A->>L: 调用本地工具
  L-->>A: 返回结果

  A->>M: 调用标准化工具
  M-->>A: 返回结果

  A->>H: 调用业务系统接口
  H-->>A: 返回结果
```

### 3.3.4 一句话判断

```text
Tool 是业务能力
MCP 是一种工具接入协议
HTTP API 是另一种工具接入方式
本地插件是最直接的工具实现方式
```

### 3.3.5 落到 dsh 时怎么理解

如果把这件事放回 DeepSeek Harness 里，可以这样对应：

| 业务概念 | dsh 里更像什么 | 说明 |
|----------|----------------|------|
| 本地 Agent 工具 | `Tool` + 本地插件 | 直接在本机进程内或本机资源上执行 |
| 服务 Agent 接口 | `Tool` + 远程适配层 | Agent 通过 API / RPC / MCP 去调用外部能力 |
| MCP 服务 | 工具暴露层之一 | 让多个客户端用统一协议调用同一套能力 |
| HTTP API | 业务系统接入层 | 最常见的企业系统对接方式 |
| Worker Pool | Agent 执行层 | 负责并发跑多个 task |
| Session/Task/Event | 会话和状态层 | 负责隔离、暂停和恢复 |

如果你只记一句：

```text
dsh 关心的是 Agent 怎么安全地调用 Tool
MCP / HTTP / 本地插件 只是 Tool 的不同实现和接入方式
```

---

## 4. 服务 Agent 怎么做用户隔离

服务 Agent 的关键问题是：

```text
同一个 Agent 服务很多用户，怎么保证用户 A 和用户 B 不串上下文？
```

答案是：共享 Agent 能力，不共享任务上下文。

```text
共享：
  - Agent 代码
  - Tool 定义
  - Prompt 模板
  - Worker 代码

隔离：
  - tenant_id
  - user_id
  - session_id
  - task_id
  - event
  - checkpoint
  - permission_scope
```

### 4.1 隔离模型

```mermaid
flowchart TD
  A[Agent Runtime] --> TA[task_A]
  A --> TB[task_B]
  A --> TC[task_C]

  TA --> SA[session_A]
  TA --> EA[events_A]
  TA --> CA[context_A]
  TA --> PA[permission_A]

  TB --> SB[session_B]
  TB --> EB[events_B]
  TB --> CB[context_B]
  TB --> PB[permission_B]

  TC --> SC[session_C]
  TC --> EC[events_C]
  TC --> CC[context_C]
  TC --> PC[permission_C]
```

每次执行都必须按 `task_id` 重新加载上下文：

```text
load task by task_id
load session by task.session_id
check tenant_id and user_id
load events where task_id = task.id
build context
run one turn
append event
save status
```

不要把当前用户放在全局变量里。

错误示例：

```text
global_current_user = user_A
global_context = context_A

另一个请求进来：
global_current_user = user_B
global_context = context_B
```

这样并发时很容易串上下文。

### 4.2 数据表建议

MVP 可以先从这些表开始：

```text
sessions
  id
  tenant_id
  user_id
  status
  created_at

tasks
  id
  tenant_id
  session_id
  status
  checkpoint
  version
  created_at
  updated_at

events
  id
  tenant_id
  task_id
  type
  payload
  created_at

review_tasks
  id
  tenant_id
  task_id
  status
  decision_payload
  reviewer_id
  version
  reviewed_at

audit_logs
  id
  tenant_id
  task_id
  action
  actor
  payload
  created_at
```

所有查询都必须带隔离条件：

```sql
select * from tasks
where id = :task_id
  and tenant_id = :tenant_id;
```

审核任务也要校验归属：

```text
review_task.task_id
  -> task.session_id
  -> session.tenant_id
  -> reviewer.permission_scope
```

### 4.3 工具调用也要隔离

服务端工具不能只接收一个 `ticket_id`。

它应该带上权限上下文：

```json
{
  "tenant_id": "mall_a",
  "user_id": "user_001",
  "task_id": "task_001",
  "ticket_id": "ticket_123",
  "allowed_actions": ["read_ticket", "create_assignment"]
}
```

工具内部要做校验：

```text
这个 tenant 能不能访问这个 ticket？
这个 user 能不能操作这个业务？
这个 task 是否还处于可执行状态？
这个动作是否已经执行过？
```

---

## 5. 一个 Agent 怎么同时跑多个 Turn

这里最容易误解。

不是一个 Turn 循环同时处理很多用户，而是：

```text
同一个 Agent 定义
  -> runTurn(task_A)
  -> runTurn(task_B)
  -> runTurn(task_C)
```

每个 Turn 实例只处理一个 task。

```mermaid
flowchart LR
  Q[Job Queue] --> W1[Worker 1]
  Q --> W2[Worker 2]
  Q --> W3[Worker 3]

  W1 --> A[runTurn task_A]
  W2 --> B[runTurn task_B]
  W3 --> C[runTurn task_C]

  A --> DA[(task_A events)]
  B --> DB[(task_B events)]
  C --> DC[(task_C events)]
```

规则很简单：

```text
不同 task 可以并发
同一个 task 必须串行
```

同一个 task 不能同时被两个 Worker 执行，否则可能重复写工单、重复发通知。

常见控制方式：

- `task.version` 乐观锁
- `task.status` 原子更新
- `review_task.status` 从 `pending` 原子更新为 `processing`
- 工具写入使用 `idempotency_key`
- 写入业务系统前检查是否已经存在结果

例如：

```sql
update tasks
set status = 'running', version = version + 1
where id = :task_id
  and status in ('pending', 'resumable')
  and version = :old_version;
```

如果更新行数是 0，说明这个 task 已经被别的 Worker 抢走了。

---

## 6. 遇到审核时怎么暂停和恢复

服务 Agent 遇到审核时，不应该让 HTTP 请求一直挂着。

正确做法是：

```text
Agent 执行到人工节点
  -> 保存 checkpoint
  -> 创建 review_task
  -> task.status = waiting_reviewer
  -> 本轮 Runner 退出
  -> 审核员提交 decision
  -> 投递 resume job
  -> Worker 重新加载 checkpoint 和 decision
  -> Agent 从暂停点继续执行
```

```mermaid
sequenceDiagram
  participant W as Agent Worker
  participant DB as DB
  participant R as 审核员页面
  participant O as 审核员
  participant Q as Job Queue

  W->>W: 执行到需要审核
  W->>DB: 保存 checkpoint
  W->>DB: 创建 review_task
  W->>DB: task.status = waiting_reviewer
  W-->>W: 退出本轮执行

  R->>DB: 查询待审核任务
  DB-->>R: 返回 review_task
  O->>R: 提交确认/修改/升级/驳回
  R->>DB: 写 reviewer_decision event
  R->>Q: 投递 resume_agent_job(task_id)

  Q-->>W: 分配 resume job
  W->>DB: 加载 task/checkpoint/decision
  W->>W: 从暂停点继续执行
  W->>DB: 写最终状态和审计
```

这里的关键点：

- 暂停不是线程阻塞。
- 暂停是状态持久化。
- 恢复不是接着原来的 HTTP 请求。
- 恢复是一个新的 Worker job。

---

## 7. 两种方案怎么选

| 问题 | 选本地 Agent 工具 | 选服务 Agent 接口 |
|------|-------------------|-------------------|
| 是否多用户 | 通常单用户或少量固定用户 | 多用户、多角色、多业务线 |
| 是否需要 Web/App 入口 | 不一定 | 通常需要 |
| 是否要审核流 | 可以有，但较简单 | 常见，需要任务和状态表 |
| 是否要操作本地文件 | 是 | 通常不是 |
| 是否要访问企业系统 | 可以，但多为本机脚本 | 是，通常通过业务工具服务 |
| 是否需要多租户隔离 | 一般不需要 | 必须考虑 |
| 是否需要审计 | 简单日志即可 | 必须系统化 |
| 是否需要水平扩展 | 一般不需要 | 需要 Worker Pool 和队列 |

粗略判断：

```text
个人使用、代码助手、本地文件处理 -> 本地 Agent 工具
客服、审批、工单、企业应用、多用户平台 -> 服务 Agent 接口
```

---

## 8. 落地建议

第一阶段不要一开始就做“大平台”。

可以按这个顺序推进：

```text
1. 先做本地 Agent 工具
   -> 验证工具设计、Prompt、业务流程是否可行

2. 再做单用户服务 Agent
   -> 接 API、存 session/task/event

3. 再做多用户隔离
   -> tenant_id、user_id、permission_scope、审计

4. 再做审核和暂停恢复
   -> review_task、checkpoint、resume job

5. 最后做生产能力
   -> 队列、锁、幂等、监控、灰度、回退
```

这样学习和落地都会更稳。
