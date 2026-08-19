# Agent 协议：MCP、A2A 与 NLWeb

来源：Microsoft Learn 开源课程 [AI Agents for Beginners - Using Agentic Protocols (MCP, A2A and NLWeb)](https://github.com/microsoft/ai-agents-for-beginners/blob/main/11-agentic-protocols/README.md)

> 本文是对原英文课程的中文整理版，不是逐字翻译。目标是帮助中文读者理解三大 Agent 协议各自解决什么问题、核心组件是什么、如何配合构建复杂的 Agent 系统。

## 1. 这节课要解决什么问题

随着 AI Agent 应用的增长，对"标准化、安全、支持开放创新"的协议需求也在增长。本课讲三个瞄准这一需求的协议：

- **MCP（Model Context Protocol）**：让 Agent 访问外部工具和数据来完成用户任务。
- **A2A（Agent to Agent）**：让不同 AI Agent 之间通信与协作。
- **NLWeb（Natural Language Web）**：给任意网站装上自然语言接口，让 Agent 能发现网站内容并与之交互。

学习目标：识别三者的核心用途和收益；解释每个协议如何促成 LLM、工具、其他 Agent 之间的通信交互；认清各协议在构建复杂 Agent 系统中的不同角色。

一句话区分：**MCP 连接"Agent 与工具"，A2A 连接"Agent 与 Agent"，NLWeb 连接"Agent 与网站"。**

## 2. MCP（Model Context Protocol）

MCP 是一个开放标准，为应用向 LLM 提供上下文和工具定义了标准化方式，相当于一个"万能适配器"——让 Agent 以一致的方式连接各种数据源和工具。

### 2.1 核心组件

MCP 采用客户端-服务器架构：

- **Host（宿主）**：发起 MCP Server 连接的 LLM 应用（如 VSCode 这样的代码编辑器）。
- **Client（客户端）**：宿主应用内的组件，与 Server 保持一对一连接。
- **Server（服务器）**：暴露特定能力的轻量程序。

MCP Server 的能力由三种核心原语（primitives）构成：

- **Tools（工具）**：Agent 可调用的离散动作/函数。如天气服务暴露 "get weather"，电商服务暴露 "purchase product"。Server 在能力清单中公布每个工具的名称、描述和输入/输出 schema。
- **Resources（资源）**：Server 能提供的只读数据项/文档，客户端按需获取。如文件内容、数据库记录、日志文件；可以是文本（代码、JSON）也可以是二进制（图片、PDF）。
- **Prompts（提示模板）**：预定义的提示词模板，支撑更复杂的工作流。

### 2.2 MCP 的收益（对比直接调 API）

- **动态工具发现**：Agent 能动态从 Server 获取可用工具清单及功能描述。传统 API 集成往往靠静态编码，API 一变代码就得改；MCP 是"集成一次"（integrate once），适应性更强。
- **跨 LLM 互操作**：MCP 不绑定特定 LLM，可以灵活切换底层模型来评估性能优劣。
- **标准化安全**：MCP 内置标准认证方式。相比为各种传统 API 分别管理不同的密钥和认证方式，接入更多 MCP Server 时扩展性更好。

### 2.3 MCP 工作流程示例（订机票）

1. **连接**：AI 助手（MCP 客户端）连接航空公司提供的 MCP Server。
2. **工具发现**：客户端问 Server"你有哪些工具？"，Server 回答有 "search flights"、"book flights"。
3. **工具调用**：用户说"帮我查波特兰到火奴鲁鲁的航班"，AI 助手的 LLM 判断需要调用 "search flights" 工具，把出发地、目的地等参数传给 MCP Server。
4. **执行与响应**：MCP Server 作为包装层，实际调用航司内部订票 API，拿到航班信息（如 JSON 数据）后返回给 AI 助手。
5. **后续交互**：AI 助手展示航班选项；用户选定后，助手再调用同一 Server 的 "book flight" 工具完成预订。

## 3. A2A（Agent-to-Agent Protocol）

MCP 解决"LLM 连工具"，A2A 更进一步：让不同的 AI Agent 之间通信与协作。A2A 可以跨组织、跨环境、跨技术栈连接 Agent，共同完成一个任务。

### 3.1 核心组件

- **Agent Card（Agent 名片）**：类似 MCP Server 的工具清单，包含：Agent 名称、通用任务描述、具体技能清单及描述（帮助其他 Agent 或人类用户理解何时该调用它）、当前 Endpoint URL、版本与能力（如是否支持流式响应、推送通知）。
- **Agent Executor（执行器）**：负责把用户对话的上下文传给远端 Agent——远端 Agent 需要这些上下文来理解要完成的任务。在 A2A 服务端，Agent 用自己的 LLM 解析请求、用自己的内部工具执行任务。
- **Artifact（工件）**：远端 Agent 完成任务后，其工作成果以工件形式产出，包含结果、完成内容的描述和通过协议传输的文本上下文。工件发送后，与远端 Agent 的连接关闭，直到下次需要。
- **Event Queue（事件队列）**：处理更新和消息传递。生产环境中尤为重要——防止任务耗时较长时 Agent 间连接提前关闭。

### 3.2 A2A 的收益

- **增强协作**：不同厂商、不同平台的 Agent 可以交互、共享上下文、协同工作，打通传统上彼此隔绝的系统。
- **模型选择灵活**：每个 A2A Agent 自主决定用哪个 LLM 处理请求，各 Agent 可以用各自优化/微调过的模型（不像某些 MCP 场景只有单一 LLM 连接）。
- **内置认证**：认证直接集成在 A2A 协议里，为 Agent 交互提供健壮的安全框架。

### 3.3 A2A 工作流程示例（订整趟行程）

1. **用户请求**：用户对 "Travel Agent"（A2A 客户端/Agent）说："帮我订下周去火奴鲁鲁的整趟行程，包括机票、酒店、租车。"
2. **编排**：Travel Agent 用 LLM 推理任务，判断需要与其他专业 Agent 交互。
3. **Agent 间通信**：通过 A2A 协议连接下游 Agent——由不同公司开发的"航司 Agent""酒店 Agent""租车 Agent"。
4. **委派执行**：Travel Agent 向各专业 Agent 分派具体任务（查航班/订酒店/租车）。每个专业 Agent 运行自己的 LLM、使用自己的工具（这些工具本身可能就是 MCP Server）完成各自环节。
5. **汇总响应**：所有下游 Agent 完成后，Travel Agent 汇总结果（航班详情、酒店确认、租车预订），以对话形式给用户一个完整答复。

## 4. NLWeb（Natural Language Web）

网站一直是用户获取互联网信息的主要途径。NLWeb 的目标是给任意网站装上自然语言接口，让网站内容既能被人用自然语言查询，也能被 AI Agent 发现和调用——就像 HTML 让文档共享成为可能一样，NLWeb 想为 "AI Web" 打下简单的基础。

### 4.1 组成部分

- **NLWeb 应用（核心服务代码）**：处理自然语言问题的系统，串联平台各部分生成回答——网站自然语言能力的"引擎"。
- **NLWeb 协议**：与网站进行自然语言交互的基础规则集，以 JSON 格式返回响应（常用 Schema.org）。
- **MCP Server 端点**：每个 NLWeb 部署同时是一个 MCP Server，能向其他 AI 系统共享工具（如 "ask" 方法）和数据——网站内容和能力由此可被 Agent 使用，网站成为"Agent 生态"的一部分。
- **Embedding 模型**：把网站内容转成向量表示，捕捉语义供计算机比较和搜索；用户可自选 Embedding 模型。
- **向量数据库（检索机制）**：存储网站内容的向量。用户提问时，NLWeb 查向量库快速找出最相关的信息，按相似度排序返回候选。支持 Qdrant、Snowflake、Milvus、Azure AI Search、Elasticsearch 等。

### 4.2 NLWeb 工作流程示例（旅行网站）

1. **数据摄入**：旅行网站现有的产品目录（航班、酒店描述、跟团产品）用 Schema.org 格式化或通过 RSS 加载；NLWeb 工具摄入这些结构化数据、生成向量、存入向量库。
2. **自然语言查询（人类）**：用户不再翻菜单，直接在聊天框输入："帮我找下周火奴鲁鲁带泳池的亲子酒店。"
3. **NLWeb 处理**：查询同时发给 LLM（理解意图）和向量库（检索相关酒店）。
4. **准确结果**：LLM 解读检索结果，按"亲子""泳池""火奴鲁鲁"条件挑出最佳匹配，生成自然语言回答。关键是：回答引用的是**网站目录里真实存在的酒店**，避免编造信息。
5. **Agent 交互**：由于 NLWeb 同时是 MCP Server，外部 AI 旅行 Agent 也可以连接该网站的 NLWeb 实例，用 `ask` 方法直接查询：`ask("火奴鲁鲁地区有酒店推荐的素食友好餐厅吗？")`，NLWeb 基于已加载的餐厅数据返回结构化 JSON。

## 5. 三个协议如何配合

| 协议 | 连接对象 | 类比 | 典型角色 |
|------|---------|------|---------|
| MCP | Agent ↔ 工具/数据 | 万能适配器 | 给单个 Agent 扩展能力 |
| A2A | Agent ↔ Agent | 跨公司协作网络 | 多 Agent 编排与委派 |
| NLWeb | Agent/人 ↔ 网站 | AI 时代的 HTML | 让网站内容进入 Agent 生态 |

三者可以叠加使用：A2A 编排的下游 Agent 内部用 MCP 调工具；NLWeb 站点本身就是一个 MCP Server，可被任何 Agent 接入。

## 6. 延伸资料

- [MCP for Beginners](https://github.com/microsoft/mcp-for-beginners)
- [MCP 官方文档](https://modelcontextprotocol.io/)
- [NLWeb 仓库](https://github.com/microsoft/NLWeb)
- [Microsoft Agent Framework](https://learn.microsoft.com/agent-framework/)
- [Microsoft Foundry Discord 社区](https://discord.com/invite/ATgtXmAS5D)

---

- 上一课：[10-AI Agent 生产化](10-ai-agents-production-zh-optimized.md)
- 下一课：[12-上下文工程](12-context-engineering-zh-optimized.md)
