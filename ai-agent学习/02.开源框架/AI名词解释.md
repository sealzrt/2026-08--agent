# AI 名词解释

整理日期：2026-08-05

> 本文面向 AI Agent 应用开发和框架选型，解释常见基础名词、Agent 工程概念、工作流概念和相关协议。重点不是学术定义，而是帮助工程开发者理解这些词在实际系统中的作用。

## 1. 快速关系图

可以先用下面这条线理解 AI Agent 应用的演进：

```text
LLM
  -> Prompt
  -> RAG
  -> Tool Calling / Function Calling
  -> Workflow
  -> Agent
  -> Workflow Agent / Agentic Workflow
  -> Multi-Agent
  -> Context Engineering / Harness Engineering
```

简单理解：

- `Prompt` 解决“怎么问模型”。
- `RAG` 解决“怎么给模型补充外部知识”。
- `Tool Calling` 解决“怎么让模型调用外部能力”。
- `Workflow` 解决“怎么把步骤编排起来”。
- `Agent` 解决“怎么让模型根据目标自主选择步骤和工具”。
- `Context Engineering` 解决“怎么给模型正确上下文”。
- `Harness Engineering` 解决“怎么把模型放进可靠的工程运行框架”。

### 2.1 通俗理解

可以把一套 AI Agent 系统想象成一个团队：

```text
LLM                 = 会思考和表达的人
Prompt              = 任务说明书
Context             = 这个人手边拿到的资料
RAG                 = 临时去知识库查资料
Tool Calling        = 使用电话、浏览器、数据库等工具
Workflow            = 公司规定好的办事流程
Agent               = 能根据目标决定下一步的执行者
Harness              = 工作台、权限系统、日志和安全护栏
Coding Agent        = 专门负责软件开发的执行者
```

最重要的区别：

```text
模型：        能回答问题
Agent：       能为了目标连续采取行动
Agent 框架：  帮你开发自己的 Agent
Coding Agent：已经做好的、专门改代码的 Agent 产品
```

### 2.2 AI Agent 的演进过程

```text
阶段 1：模型问答

用户问题 ─────────────> LLM ─────────────> 文本回答


阶段 2：模型 + 外部资料

用户问题 ──> 检索资料 ──> LLM ──> 有资料依据的回答
               │
               └──── RAG


阶段 3：模型 + 工具

用户目标 ──> LLM 判断 ──> 调用工具 ──> 获得结果 ──> LLM 回答
                │              │
                │              └──── API / 数据库 / 文件 / 浏览器
                └──── Tool Calling


阶段 4：工作流 Agent

开始
  │
  ├── 分析任务
  ├── 检索资料
  ├── 调用工具
  ├── 判断是否需要重试
  ├── 人工确认
  └── 输出结果


阶段 5：软件工程 Coding Agent

用户需求
  -> 读取代码仓库
  -> 理解项目结构
  -> 制定修改计划
  -> 编辑代码
  -> 运行测试
  -> 修复问题
  -> 输出变更结果
```

前四个阶段通常是你要“开发”的 Agent 应用；第五个阶段的 Codex、Claude Code 则是已经可以直接使用的 Coding Agent 产品。

## 2. 基础模型概念

### 2.1 AI

AI 是 Artificial Intelligence，人工智能。现在工程语境里说 AI，通常指能处理文本、图像、音频、视频、代码、工具调用等任务的模型和应用系统。

注意：

- AI 不等于大模型。
- 大模型是当前 AI 应用的核心基础设施之一。
- Agent 是构建在模型、工具、状态、工作流之上的应用形态。

### 2.2 Model

Model 是模型。它接收输入，生成输出。

常见模型类型：

- 文本模型：处理自然语言、代码、结构化文本。
- 多模态模型：同时处理文本、图像、音频、视频等。
- Embedding 模型：把文本或图片转换成向量。
- Rerank 模型：对检索结果重新排序。

工程上要关注：

- 上下文窗口大小。
- 输入输出价格。
- 延迟。
- 工具调用能力。
- 结构化输出能力。
- 多模态能力。
- 是否支持流式输出。

### 2.3 LLM

LLM 是 Large Language Model，大语言模型。它擅长理解和生成自然语言，也可以处理代码、结构化数据和工具调用。

常见用途：

- 问答。
- 总结。
- 分类。
- 信息抽取。
- 代码生成。
- 任务规划。
- 工具调用决策。

限制：

- 可能幻觉。
- 不天然知道企业私有数据。
- 不天然具备执行外部动作的能力。
- 对上下文质量非常敏感。

### 2.4 Token

Token 是模型处理文本的基本单位，可以粗略理解为“文本切片”。一个汉字、一个英文单词、一个标点或一个词的一部分，都可能对应一个或多个 token。

Token 影响：

- 上下文长度。
- 调用成本。
- 响应延迟。
- 能放进模型的资料量。

工程建议：

- 不要无限塞历史消息。
- RAG 结果要筛选和压缩。
- 长文档要切块。
- 日志中要记录 token 使用量，方便控制成本。

### 2.5 Context Window

Context Window 是模型一次调用能接收的最大上下文长度，包括系统提示词、用户输入、历史消息、工具定义、检索资料和模型输出。

误区：

- 上下文窗口越大，不代表效果一定越好。
- 塞太多无关内容会干扰模型判断。
- 长上下文会增加成本和延迟。

### 2.6 Temperature

Temperature 控制模型输出的随机性。

- 低 temperature：输出更稳定，适合分类、抽取、结构化输出。
- 高 temperature：输出更多样，适合创意写作、头脑风暴。

在 Agent 系统中，工具调用、结构化输出、审批类任务通常建议使用较低 temperature。

## 3. Prompt 相关概念

### 3.1 Prompt

Prompt 是给模型的输入指令。它可以包括任务目标、角色、背景、约束、输出格式、示例和可用工具说明。

一个工程化 Prompt 通常包含：

- 任务说明。
- 输入数据。
- 输出格式。
- 约束条件。
- 示例。
- 错误处理要求。

### 3.2 System Prompt

System Prompt 是系统级指令，用来定义模型行为边界，例如角色、语气、安全限制、工具使用规则等。

示例：

```text
你是企业内部知识库助手。只能基于提供的资料回答问题。如果资料不足，必须说明无法确定。
```

### 3.3 Prompt Engineering

Prompt Engineering 是设计、调整和测试提示词的过程。

它关注：

- 任务怎么描述。
- 输出格式怎么约束。
- 示例怎么设计。
- 如何减少幻觉。
- 如何让模型稳定调用工具。

### 3.4 Context Engineering

Context Engineering 是比 Prompt Engineering 更大的概念。它关注“模型调用时应该看到什么上下文”。

包括：

- 系统提示词。
- 用户输入。
- 历史消息。
- RAG 检索结果。
- 工具列表。
- 工具返回值。
- 状态摘要。
- 输出格式。
- 安全策略。

简单说：

```text
Prompt Engineering：怎么写提示词
Context Engineering：模型每次调用时该拿到哪些信息、工具和格式
```

在 Agent 中，Context Engineering 往往比单纯改 Prompt 更重要。

## 4. RAG 相关概念

### 4.1 RAG

RAG 是 Retrieval-Augmented Generation，检索增强生成。

核心流程：

```text
用户问题
  -> 检索相关资料
  -> 把资料放进模型上下文
  -> 模型基于资料回答
```

RAG 解决的问题：

- 模型不知道企业私有数据。
- 模型知识可能过期。
- 需要回答可追溯到资料来源。

RAG 不解决的问题：

- 不保证模型一定不幻觉。
- 不自动保证权限控制。
- 不替代数据治理。

### 4.2 Embedding

Embedding 是把文本、图片等内容转换成向量。语义相近的内容，向量距离通常更近。

用途：

- 语义检索。
- 相似问题匹配。
- 文档聚类。
- 推荐。

### 4.3 Vector Database

Vector Database 是向量数据库，用于存储和检索 embedding。

常见用途：

- 文档知识库。
- 语义搜索。
- RAG 检索。

选型时要关注：

- 检索性能。
- 过滤能力。
- 权限隔离。
- 数据更新和删除。
- 运维成本。

### 4.4 Chunk

Chunk 是文档切块。长文档通常要拆成多个较小片段，再做 embedding 和检索。

切块要考虑：

- 块大小。
- 重叠长度。
- 标题和层级结构。
- 表格、代码、图片说明。
- 元数据。

### 4.5 Retriever

Retriever 是检索器，负责根据用户问题找到相关资料。

常见检索方式：

- 关键词检索。
- 向量检索。
- 混合检索。
- 元数据过滤。

### 4.6 Rerank

Rerank 是重排序。先用检索器取回一批候选资料，再用 rerank 模型或规则重新排序，把更相关的资料放前面。

RAG 常见链路：

```text
query -> retrieve top 50 -> rerank top 10 -> inject context -> answer
```

### 4.7 Grounding

Grounding 是让模型回答有依据，通常指让模型基于给定资料、工具结果或数据库内容回答。

工程上要配合：

- 引用来源。
- 不足时拒答。
- 输出证据。
- 检索结果质量检查。

## 5. 工具调用相关概念

### 5.1 Tool

Tool 是模型或 Agent 可以调用的外部能力。

常见工具：

- 查询天气。
- 搜索网页。
- 查询数据库。
- 读取文件。
- 调用 HTTP API。
- 创建工单。
- 发送邮件。

工具让模型从“只会生成文本”变成“可以使用外部系统”。

### 5.2 Tool Calling

Tool Calling 是模型根据任务决定是否调用工具，并生成工具调用参数。

流程：

```text
用户问题
  -> 模型判断需要工具
  -> 模型生成工具名和参数
  -> 程序执行工具
  -> 工具结果返回给模型
  -> 模型继续回答或继续调用工具
```

### 5.3 Function Calling

Function Calling 通常是 Tool Calling 的一种实现形式。模型不会真的执行函数，而是输出要调用的函数名和参数；真正执行函数的是你的程序。

关键点：

- 模型负责选择工具和生成参数。
- 程序负责校验参数和执行工具。
- 工具执行结果再返回给模型。

### 5.4 Structured Output

Structured Output 是结构化输出，要求模型按 JSON Schema、Pydantic 模型或其他结构返回结果。

适合：

- 分类。
- 信息抽取。
- 表单生成。
- 工具参数生成。
- Agent 中间状态更新。

示例：

```json
{
  "intent": "create_ticket",
  "priority": "high",
  "need_human_review": true
}
```

### 5.5 Tool Schema

Tool Schema 描述工具的名称、说明、参数和参数类型。

好的工具 schema 应该：

- 名称清晰。
- 说明明确。
- 参数少而稳定。
- 参数类型严格。
- 明确什么情况下使用。

### 5.6 Tool Result

Tool Result 是工具执行后的返回值。

建议：

- 返回结构化数据。
- 包含错误信息。
- 区分空结果和失败。
- 不要直接返回过长原文。
- 对敏感数据做脱敏。

## 6. Agent 相关概念

### 6.1 Agent

Agent 是由模型驱动、能根据目标选择动作的系统。它通常具备：

- 指令。
- 模型。
- 工具。
- 状态。
- 记忆。
- 运行循环。
- 退出条件。
- 可观测和安全约束。

一个简化 Agent 循环：

```text
接收任务
  -> 模型思考下一步
  -> 选择工具或直接回答
  -> 执行工具
  -> 观察结果
  -> 继续下一步
  -> 完成任务
```

### 6.2 Agent Loop

Agent Loop 是 Agent 的运行循环：

```text
LLM call -> tool call -> tool result -> LLM call -> ...
```

循环必须有终止条件，否则可能无限调用工具或无限生成。

### 6.3 ReAct

ReAct 是 Reasoning + Acting 的缩写，强调模型在推理和行动之间交替进行。

典型模式：

```text
思考 -> 行动 -> 观察 -> 思考 -> 行动 -> 观察 -> 最终回答
```

现在很多 Agent 框架都吸收了这个思想，但具体实现不一定显式暴露“思考”文本。

### 6.4 Planner

Planner 是计划器，负责把目标拆成步骤。

示例：

```text
目标：生成竞品分析报告
计划：
1. 收集竞品列表
2. 检索产品信息
3. 提取价格和功能
4. 对比优劣势
5. 生成报告
```

### 6.5 Executor

Executor 是执行器，负责执行计划中的步骤，例如调用工具、查询资料、生成中间结果。

有些框架会显式区分 Planner 和 Executor，有些框架则把它们合在一个 Agent 循环里。

### 6.6 Memory

Memory 是记忆。它可以指：

- 当前对话历史。
- 本次任务状态。
- 用户偏好。
- 长期知识。
- 历史任务结果。

要区分：

- 短期记忆：当前会话或当前任务使用。
- 长期记忆：跨会话、跨任务保存。
- 业务数据：应进入业务数据库，不应只存在 Agent 记忆里。

### 6.7 State

State 是状态，表示当前任务执行到哪里、已有数据是什么、下一步需要什么。

在 LangGraph 这类框架中，State 是核心抽象：

```text
节点读取 State -> 执行动作 -> 返回 State 更新
```

### 6.8 Handoff

Handoff 是任务交接。一个 Agent 可以把任务交给另一个更专业的 Agent。

示例：

- 客服 Agent 识别到退款问题，交给退款 Agent。
- 总控 Agent 判断需要法律审查，交给法务 Agent。

### 6.9 Multi-Agent

Multi-Agent 是多 Agent 协作系统。

常见模式：

- 主管 Agent + 专家 Agent。
- 多角色协作。
- 辩论式 Agent。
- 审阅者 Agent。
- 工具型子 Agent。

风险：

- 成本上升。
- 调试困难。
- 责任边界不清。
- 容易出现无意义对话循环。

### 6.10 Human-in-the-loop

Human-in-the-loop 是人在回路中，指 Agent 在关键节点暂停，等待人工确认、修改或审批。

适合：

- 高风险操作。
- 写入业务系统。
- 发布内容。
- 资金、权限、合同、合规相关动作。

### 6.11 Guardrails

Guardrails 是护栏，用来限制输入、输出和行为。

常见护栏：

- 输入安全检查。
- 输出合规检查。
- 工具调用权限控制。
- 敏感信息过滤。
- 高风险动作要求人工确认。

### 6.12 Evals

Evals 是评测，用来衡量模型或 Agent 的效果。

评测对象：

- 回答准确性。
- 工具调用是否正确。
- 是否遵守格式。
- 是否引用正确资料。
- 是否完成任务。
- 成本和延迟。

Agent 评测比普通问答评测更复杂，因为它还要评估中间过程。

### 6.13 Tracing

Tracing 是追踪，用来记录一次 Agent 运行过程中的每一步。

通常记录：

- 模型调用。
- 工具调用。
- 工具参数。
- 工具结果。
- 中间状态。
- 错误。
- 耗时。
- token 和费用。

没有 tracing 的 Agent 很难调试。

### 6.14 Coding Agent / Software Engineering Agent

Coding Agent 是专门用于软件开发任务的 Agent，也可以称为 Software Engineering Agent。

它不是简单的代码补全工具，而是可以围绕一个开发目标连续执行多步工作：

```text
理解需求
  -> 阅读代码
  -> 搜索相关文件
  -> 制定修改方案
  -> 编辑代码
  -> 执行测试或构建
  -> 分析错误
  -> 继续修复
  -> 汇报结果
```

典型能力：

- 理解整个代码仓库。
- 读取和编辑多个文件。
- 执行 Shell 命令。
- 运行测试、构建和静态检查。
- 根据错误输出继续修改。
- 使用 Git 查看差异。
- 通过权限系统限制危险操作。
- 保存会话，支持继续任务。

### 6.15 Codex 属于哪一种？

Codex 属于 **Coding Agent / 软件工程 Agent 产品**。

通俗理解：

```text
LangGraph       = 让开发者搭建 Agent 工作流的框架
Codex           = 已经搭建好的、专门帮助开发软件的 Agent
```

Codex 的典型工作方式是：

```text
用户提出开发任务
  -> Codex 理解代码仓库和约束
  -> 读取文件、搜索代码
  -> 修改代码
  -> 运行命令和测试
  -> 检查结果
  -> 向用户汇报修改内容
```

因此，Codex 不应归入“LangGraph、CrewAI、Pydantic AI 这类 Agent 开发框架”。它更接近一个面向软件工程的 Agent 应用 / 开发工具。

需要区分：

- Codex 使用了模型、工具、上下文、权限、执行环境和工作流。
- 这些能力组成了 Codex 的运行系统，但不等于 Codex 是一个通用 Agent 框架。
- 如果你要开发自己的客服 Agent、审批 Agent 或知识库 Agent，应选 Agent SDK、LangGraph、CrewAI 等框架或平台。
- 如果你要让一个现成工具帮你阅读、修改和测试代码，Codex 属于直接使用的 Coding Agent。

### 6.16 Claude Code CLI 属于哪一种？

Claude Code CLI 也属于 **Coding Agent / 软件工程 Agent 产品**，更具体地说是 **CLI-first Coding Agent**。

它的“CLI”描述的是使用入口，不是 Agent 类型：

```text
CLI                  = 终端交互方式
Claude Code          = 运行在 CLI 中的 Coding Agent
Claude Code CLI      = 通过命令行使用 Coding Agent
```

Claude Code 的典型工作方式：

```text
进入项目目录
  -> claude
  -> 描述需求
  -> Agent 读取项目和配置
  -> Agent 使用文件、Shell、Git、MCP 等工具
  -> 修改代码并运行检查
  -> 用户继续追问或恢复会话
```

它与 Codex 的共同点：

- 都是面向软件开发的 Agent 产品。
- 都能读取项目上下文。
- 都能进行多步工具调用。
- 都能修改代码并执行验证。
- 都需要权限、沙箱或用户确认来控制风险。

它们与 Agent 开发框架的区别：

| 对象 | 分类 | 主要使用者 | 主要目的 |
| --- | --- | --- | --- |
| Codex | Coding Agent 产品 | 软件开发者、团队 | 直接完成软件开发任务 |
| Claude Code CLI | CLI-first Coding Agent 产品 | 终端用户、软件开发者 | 在代码仓库中完成开发任务 |
| LangGraph | Agent 开发框架 | Agent 开发者 | 开发自己的状态图和 Agent 工作流 |
| CrewAI | Multi-Agent 开发框架 | Agent 开发者 | 开发角色协作式 Agent |
| Dify | Agent 应用平台 | 开发者和业务人员 | 低代码构建 AI 应用和 Agent |
| n8n | 自动化编排平台 | 开发者和业务人员 | 把 AI 接入业务系统和自动化流程 |

### 6.17 Agent、Coding Agent、Agent Framework 的区别

| 名词 | 一句话理解 | 示例 |
| --- | --- | --- |
| LLM | 会理解和生成内容的模型 | GPT、Claude、Gemini |
| Agent | 围绕目标自主选择步骤和工具的系统 | 研究 Agent、客服 Agent |
| Coding Agent | 专门处理软件开发任务的 Agent | Codex、Claude Code |
| Agent Framework | 用来开发 Agent 的代码框架 | LangGraph、CrewAI、Pydantic AI |
| Agent Platform | 用来低代码构建和运营 Agent 的平台 | Dify、n8n |
| CLI | 命令行交互入口 | `claude`、终端版 Codex |

核心关系：

```text
LLM
  -> Agent Runtime / Harness
  -> 通用 Agent
  -> 专业 Agent
      -> Coding Agent
      -> 客服 Agent
      -> 数据分析 Agent
      -> 研究 Agent

Agent Framework / Agent Platform
  -> 用来开发或配置上面的 Agent
```

## 7. Workflow 相关概念

### 7.1 Workflow

Workflow 是工作流，表示一组明确步骤和流转规则。

示例：

```text
提交需求 -> 分析需求 -> 检索资料 -> 生成报告 -> 人工审批 -> 发布
```

Workflow 强调流程可控。

### 7.2 Agentic Workflow

Agentic Workflow 是带有 Agent 能力的工作流。

它通常是：

```text
确定性流程 + 局部 AI 决策 + 工具调用 + 状态管理
```

比纯 Agent 更可控，比传统工作流更智能。

### 7.3 Workflow Agent

Workflow Agent 可以理解为被工作流约束的 Agent。

它不是完全自由行动，而是在规定流程内使用模型和工具完成任务。

适合：

- 企业业务流程。
- 审批流程。
- 内容生产流程。
- 数据处理流程。

### 7.4 Chain

Chain 是链式调用，表示按固定顺序执行多个步骤。

示例：

```text
Prompt -> LLM -> Parser -> Output
```

Chain 适合简单固定流程。复杂分支、循环和可恢复流程更适合 Workflow 或 Graph。

### 7.5 Graph

Graph 是图。节点表示步骤，边表示流转。

适合表达：

- 分支。
- 循环。
- 并行。
- 中断。
- 恢复。
- 多 Agent 协作。

LangGraph 就是典型的图状态编排框架。

## 8. 工程化相关概念

### 8.1 Harness

Harness 原意是“装备、约束装置”。在 AI 工程中，可以理解为包住模型的运行框架。

它负责：

- 组织 Prompt。
- 管理上下文。
- 调用工具。
- 校验输出。
- 处理错误。
- 记录日志。
- 控制成本。
- 做安全检查。

Codex、Claude Code 这类 Coding Agent 的 Harness 通常还要负责：

- 代码仓库访问。
- 文件读取和编辑。
- Shell 命令执行。
- 测试和构建。
- Git 操作。
- 权限确认。
- 沙箱隔离。
- 会话恢复。

### 8.2 Harness Engineering

Harness Engineering 是围绕模型构建可靠运行框架的工程实践。

它关注：

- 模型输入输出协议。
- 工具执行协议。
- 状态管理。
- 错误处理。
- 重试和超时。
- 权限控制。
- 观测和评测。

简单说：

```text
Prompt Engineering 让模型更会答
Context Engineering 让模型拿到正确上下文
Harness Engineering 让模型可靠地跑在系统里
```

### 8.3 Orchestration

Orchestration 是编排，指把模型、工具、状态、工作流和多个 Agent 组织起来。

框架例子：

- LangGraph：图状态编排。
- CrewAI：角色和任务编排。
- n8n / Make / Zapier：自动化流程编排。

### 8.4 Runtime

Runtime 是运行时，负责实际执行 Agent 或 Workflow。

它可能包括：

- 会话管理。
- 工具执行。
- 状态持久化。
- 并发控制。
- 中断恢复。
- 日志追踪。

### 8.5 Sandbox

Sandbox 是沙箱，用来隔离模型或 Agent 的执行环境。

常见用途：

- 安全执行代码。
- 隔离文件系统。
- 限制网络访问。
- 控制工具权限。

### 8.6 Observability

Observability 是可观测性，指系统运行时能被观察、分析和追踪。

AI Agent 的可观测性至少要包括：

- 模型输入输出。
- 工具调用。
- 状态变化。
- 错误信息。
- 耗时。
- token 消耗。
- 成本。

## 9. 协议与生态概念

### 9.1 MCP

MCP 是 Model Context Protocol，模型上下文协议。它是一个开放协议，用来标准化 AI 应用如何连接外部数据源和工具。

可以把 MCP 理解为：

```text
AI 应用连接工具和数据源的标准接口
```

MCP 中常见角色：

- MCP Host：运行 AI 应用的宿主，例如 IDE、桌面应用、Agent 平台。
- MCP Client：Host 中负责连接 MCP Server 的客户端。
- MCP Server：暴露工具、资源或提示词的服务。
- Tools：可执行动作。
- Resources：可读取资源。
- Prompts：可复用提示词模板。

### 9.2 Skill

Skill 是技能。不同平台对 Skill 的定义不同，但通常表示可复用的能力包。

可能包含：

- 指令。
- 工具。
- 示例。
- 资源文件。
- 执行脚本。

在 Agent 系统中，Skill 的价值是把某类任务的最佳实践沉淀成可复用能力。

### 9.3 Computer Use

Computer Use 是让模型像人一样操作电脑界面，例如看截图、点击按钮、输入文字、打开网页。

适合：

- 没有 API 的系统。
- 需要操作网页后台。
- 需要跨多个 GUI 工具完成任务。

风险：

- 速度慢。
- 稳定性低于 API。
- 容易受 UI 变化影响。
- 必须做好权限和人工确认。

工程建议：

- 有 API 优先用 API。
- GUI 操作作为兜底。
- 高风险操作必须人工确认。

### 9.4 A2A

A2A 是 Agent-to-Agent，指 Agent 之间的通信或协作协议 / 模式。它关注不同 Agent 如何发现彼此、交换任务、传递上下文和返回结果。

当前 A2A 生态仍在演进，落地时更重要的是先定义清楚：

- 谁是主控 Agent。
- 子 Agent 能做什么。
- 上下文如何传递。
- 失败如何返回。
- 权限如何控制。

## 10. 常见平台和框架名词

### 10.1 LangChain

LangChain 是 LLM 应用开发基础设施，提供模型、工具、Prompt、消息、Retriever、Agent 等组件。

### 10.2 LangGraph

LangGraph 是图状态编排框架，适合复杂 Agent、可恢复工作流、多步骤工具调用和 Human-in-the-loop。

### 10.3 LlamaIndex

LlamaIndex 是数据框架，强项是 RAG、文档索引、数据连接和知识库应用，也提供 Agent 和 Workflow 能力。

### 10.4 CrewAI

CrewAI 是多 Agent 协作框架，核心是角色、任务、团队和流程。

### 10.5 Dify

Dify 是开源 LLM 应用开发平台，支持聊天应用、RAG、Workflow、Agent、模型管理和运行观测。

它更像应用平台，不是代码优先的 Agent 框架。

### 10.6 n8n

n8n 是工作流自动化平台，支持 AI Agent 和大量系统集成。

它适合把 Agent 接入业务流程、SaaS 和 API，但不应简单归类为代码优先 Agent 框架。

### 10.7 Zapier / Make

Zapier 和 Make 是商业自动化平台，提供 AI Agent 能力，适合无代码或低代码业务自动化。

它们能构建 Agent，但不是开源 Agent 开发框架。

## 11. 容易混淆的概念对比

### 11.1 Prompt Engineering vs Context Engineering

| 概念 | 关注点 | 例子 |
| --- | --- | --- |
| Prompt Engineering | 指令怎么写 | 输出 JSON、按步骤回答、不要编造 |
| Context Engineering | 模型看到什么上下文 | 历史消息、检索资料、工具、状态、输出格式 |

### 11.2 RAG vs Agent

| 概念 | 核心能力 | 适合场景 |
| --- | --- | --- |
| RAG | 检索资料后回答 | 知识库问答、制度查询、文档总结 |
| Agent | 根据目标选择动作和工具 | 多步骤任务、业务操作、自动化流程 |

### 11.3 Tool Calling vs Agent

| 概念 | 含义 |
| --- | --- |
| Tool Calling | 模型调用一个或多个工具的能力 |
| Agent | 围绕目标、工具、状态和循环构建的完整系统 |

Tool Calling 是 Agent 的组成能力之一，但有 Tool Calling 不等于就是完整 Agent。

### 11.4 Workflow vs Agent

| 概念 | 特点 |
| --- | --- |
| Workflow | 流程明确、路径可控 |
| Agent | 更自主，能根据目标选择下一步 |

企业落地时常用折中方案：Agentic Workflow。

### 11.5 Memory vs State vs Database

| 概念 | 用途 |
| --- | --- |
| Memory | Agent 记忆，包括短期和长期信息 |
| State | 当前任务执行状态 |
| Database | 业务系统的持久化事实来源 |

不要把 Agent 记忆当成业务数据库。

### 11.6 Framework vs Platform

| 概念 | 典型例子 | 特点 |
| --- | --- | --- |
| Framework | LangGraph、CrewAI、Pydantic AI | 代码优先，工程控制强 |
| Platform | Dify、n8n、Zapier、Make | 低代码 / 可视化 / SaaS，交付快 |

## 12. 推荐学习顺序

如果是工程开发者，建议按这个顺序学习：

1. Token、Context Window、Prompt。
2. RAG、Embedding、Vector Database、Retriever。
3. Tool Calling、Structured Output、Tool Schema。
4. Agent、Agent Loop、Memory、State。
5. Workflow、Graph、Agentic Workflow。
6. Context Engineering、Harness Engineering。
7. Guardrails、Evals、Tracing、Observability。
8. Coding Agent、Codex、Claude Code CLI。
9. MCP、Computer Use、Skill、多 Agent。

## 13. 参考链接

- OpenAI Agents SDK - Agents：https://openai.github.io/openai-agents-python/agents/
- OpenAI Computer Use Model：https://developers.openai.com/api/docs/models/computer-use-preview
- OpenAI Codex：https://developers.openai.com/codex/
- Anthropic MCP 文档：https://docs.anthropic.com/en/docs/mcp
- Claude Code 概览：https://docs.anthropic.com/en/docs/claude-code/overview
- Claude Code CLI 参考：https://docs.anthropic.com/en/docs/claude-code/cli-usage
- LangChain Context Engineering：https://docs.langchain.com/oss/python/langchain/context-engineering
- LangGraph 文档：https://docs.langchain.com/oss/python/langgraph/overview
- Dify GitHub：https://github.com/langgenius/dify
- n8n AI Agents：https://n8n.io/ai-agents/
