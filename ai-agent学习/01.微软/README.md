# AI Agents 入门课程（中文整理版）总目录

来源：Microsoft 开源课程 [ai-agents-for-beginners](https://github.com/microsoft/ai-agents-for-beginners)（18 课）

> 本目录下的所有文档均基于**英文原版课程**重新梳理和翻译成的中文整理版（非逐字翻译，也未采用仓库自带的机翻中文），文件统一使用 UTF-8 编码。每篇文档保留英文代码示例并配中文注释，篇末附上一课/下一课导航。

## 课程结构

### 第一部分：基础概念（第 1-3 课）

| # | 课程 | 核心内容 |
|---|------|----------|
| 01 | [AI Agent 简介与应用场景](./01-ai-agents-intro-zh-optimized.md) | 什么是 Agent、LLM+工具+知识三要素、适用场景判断 |
| 02 | [Agent 框架探索](./02-agentic-frameworks-zh-optimized.md) | AutoGen、Semantic Kernel、Azure AI Agent Service 对比与选型 |
| 03 | [Agent 设计模式（设计原则）](./03-agentic-design-patterns-zh-optimized.md) | 以 Agent 为中心的 UX 三原则：空间、时间、核心 |

### 第二部分：核心能力（第 4-9 课）

| # | 课程 | 核心内容 |
|---|------|----------|
| 04 | [工具使用设计模式](./04-tool-use-zh-optimized.md) | 函数调用工作流、工具 schema、框架实现与安全考量 |
| 05 | [Agentic RAG](./05-agentic-rag-zh-optimized.md) | Agent 主导的迭代式检索、自纠正循环、治理 |
| 06 | [构建可信赖的 AI Agent](./06-trustworthy-agents-zh-optimized.md) | 系统消息框架、人在环中、威胁与缓解 |
| 07 | [规划设计模式](./07-planning-design-zh-optimized.md) | 任务分解、结构化输出规划、迭代修正 |
| 08 | [多 Agent 设计模式](./08-multi-agent-zh-optimized.md) | 群聊/交接/协同过滤模式、多 Agent 适用场景 |
| 09 | [元认知设计模式](./09-metacognition-zh-optimized.md) | 自我反思、纠正性 RAG、按意图搜索、代码生成 Agent |

### 第三部分：生产工程（第 10-13 课）

| # | 课程 | 核心内容 |
|---|------|----------|
| 10 | [AI Agent 上生产](./10-ai-agents-production-zh-optimized.md) | 可观测性（Trace/Span）、离线/在线评估、常见问题应对 |
| 11 | [Agentic 协议](./11-agentic-protocols-zh-optimized.md) | MCP、A2A、NLWeb 三大协议的原理与协作 |
| 12 | [上下文工程](./12-context-engineering-zh-optimized.md) | 写入/选取/压缩/隔离策略、四种上下文失效及对策 |
| 13 | [Agent 记忆](./13-agent-memory-zh-optimized.md) | 工作/短期/长期/情景/实体记忆、Mem0/Cognee/Azure AI Search |

### 第四部分：微软技术栈实战（第 14-18 课）

| # | 课程 | 核心内容 |
|---|------|----------|
| 14 | [Microsoft Agent Framework 深入](./14-microsoft-agent-framework-zh-optimized.md) | Agent/线程/中间件/记忆/Workflow、LangGraph 托管到 Foundry |
| 15 | [计算机使用 Agent（CUA）](./15-browser-use-zh-optimized.md) | Browser-Use + Playwright、Agent vs Actor、安全护栏、Project Opal |
| 16 | [部署可扩展的 Agent](./16-deploying-scalable-agents-zh-optimized.md) | 三种部署模式、评估门禁、模型路由与缓存、冒烟测试 |
| 17 | [创建本地 AI Agent](./17-creating-local-ai-agents-zh-optimized.md) | SLM、Foundry Local + Qwen、本地 RAG（Chroma）、混合路由 |
| 18 | [AI Agent 安全](./18-securing-ai-agents-zh-optimized.md) | 密码学回执、Ed25519+JCS+哈希链、审计链与治理边界 |

## 推荐学习路径

- **快速入门**：01 → 02 → 04 → 05（理解 Agent 是什么、怎么调工具、怎么接知识）
- **架构设计**：03 → 07 → 08 → 12 → 13（设计模式与上下文/记忆工程）
- **上生产**：06 → 10 → 16 → 18（可信、可观测、可扩展、可审计）
- **微软技术栈**：14 → 16 → 17（MAF → Foundry 云端部署 → Foundry Local 本地部署）

## 贯穿全课程的核心思想

1. **Agent = LLM + 工具 + 知识**，模型只占生产系统约 20%，其余是工程骨架
2. **评估是门禁而不是事后检查**：离线评估拦截发布，在线观测反哺测试集
3. **上下文是稀缺资源**：写入、选取、压缩、隔离——上下文工程贯穿工具、RAG、记忆、多 Agent
4. **信任要分层构建**：输入校验 → 策略强制 → 人在环中 → 审计回执，任何一层都不能替代其他层
