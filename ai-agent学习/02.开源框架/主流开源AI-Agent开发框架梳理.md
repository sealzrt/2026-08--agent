# 主流开源 AI Agent 开发框架梳理

整理日期：2026-08-05

> 本文梳理当前主流、仍具活跃度或生态影响力的 AI Agent 开发框架与相关平台。判断标准包括：开源可用、官方持续维护、社区采用度、Agent 能力完整度、工程化能力、与主流模型和工具生态的适配程度。
>
> 注意：本文核心对象仍是“代码优先的 Agent 开发框架”。Dify、n8n、Zapier、Make 这类低代码 / 自动化平台也可以构建 Agent 或 Agentic Workflow，但它们更适合归为“Agent 应用平台 / 自动化编排平台”，不宜和 LangGraph、CrewAI、Pydantic AI 等代码框架完全混为一类。

## 1. 快速结论

如果只做选型，可以先按下面思路判断：

| 场景 | 优先考虑 | 原因 |
| --- | --- | --- |
| Python Agent 应用、复杂流程编排、状态机、多步骤工具调用 | LangGraph | 图状态建模清晰，适合复杂 Agent 流程和可控编排 |
| 企业级 .NET / Python、多 Agent、微软生态、Azure 集成 | Microsoft Agent Framework | 微软新一代 Agent 框架，承接 Semantic Kernel 与 AutoGen 方向 |
| 多角色协作、任务分工、业务流程型 Agent | CrewAI | 上手快，角色、任务、流程抽象直观 |
| RAG + Agent、知识库问答、文档工作流 | LlamaIndex Workflows / Agents | 数据连接、索引、检索和 Agent 结合能力强 |
| 轻量 Python Agent，强调类型安全和结构化输出 | Pydantic AI | 适合工程团队构建可靠、可测试的 Agent 应用 |
| OpenAI 模型与工具调用优先，想用官方轻量 SDK | OpenAI Agents SDK | 模型、工具、handoff、tracing 设计简洁，适合 OpenAI 生态 |
| Google Gemini / Vertex AI 生态 | Google Agent Development Kit | 面向 Google AI 生态的 Agent 开发与部署 |
| 轻量实验、教学、快速原型 | smolagents | Hugging Face 推出的轻量 Agent 框架，概念简单 |
| 生产级搜索、RAG、企业问答，再扩展 Agent | Haystack | 文档检索和 Pipeline 生态成熟 |
| 多智能体研究、仿真、社会模拟 | CAMEL-AI | 多 Agent 研究和角色协作实验能力强 |
| 低代码构建 LLM 应用、RAG、工作流、Agent | Dify | 开源 LLM 应用开发平台，适合快速搭建可运营的 AI 应用 |
| 业务自动化 + AI Agent 编排 + 大量 SaaS 集成 | n8n | fair-code / source-available 自动化平台，适合把 Agent 接入业务系统 |
| 无代码 SaaS 自动化、跨应用动作执行、业务人员自建 Agent | Zapier / Make | 商业自动化平台，具备 AI Agent 能力，但不是开源代码框架 |

## 2. 主流框架总览

> 推荐指数按“通用 Agent 开发选型价值”排序，综合框架定位、Agent 能力完整度、工程化能力、生态活跃度、生产可控性和学习投入评估；不等同于 GitHub Star 数或商业影响力。最高 10 颗星。

| 框架 | 推荐指数 | 主要语言 | 核心定位 | 适合场景 | 选型注意 |
| --- | --- | --- | --- | --- | --- |
| LangGraph | ★★★★★★★★★★ | Python / JS | 可控的 Agent 状态图与流程编排 | 复杂任务、多步骤工具调用、可恢复工作流、多 Agent | 学习曲线高于简单 Agent 框架 |
| Microsoft Agent Framework | ★★★★★★★★★☆ | .NET / Python | 企业级 Agent 与多 Agent 编排 | 微软生态、企业系统集成、AutoGen / Semantic Kernel 迁移 | 生态仍在快速演进 |
| LlamaIndex | ★★★★★★★★★☆ | Python / TS | 数据框架 + Agent / Workflow | RAG、知识库、文档问答、数据密集型 Agent | 如果不涉及数据检索，可能偏重 |
| Dify | ★★★★★★★★★☆ | 平台 / Python / TS | 开源 LLM 应用开发平台 | 低代码 AI 应用、RAG、Workflow、Agent、运营后台 | 更偏应用平台，不是代码优先框架 |
| CrewAI | ★★★★★★★★☆☆ | Python | 角色、任务、团队协作式 Agent | 业务流程自动化、多角色分工、原型到应用 | 复杂状态控制不如 LangGraph 细 |
| OpenAI Agents SDK | ★★★★★★★★☆☆ | Python / TS | OpenAI 官方 Agent SDK | OpenAI 模型、工具调用、handoff、tracing | 强绑定 OpenAI 生态优势明显 |
| Pydantic AI | ★★★★★★★★☆☆ | Python | 类型安全的 Agent 应用框架 | Python 后端、结构化输出、可靠性要求高 | 抽象较轻，复杂多 Agent 需自行设计 |
| Haystack | ★★★★★★★★☆☆ | Python | RAG Pipeline + Agent | 企业搜索、文档问答、可观测 Pipeline | Agent 不是唯一核心，RAG 场景更强 |
| n8n | ★★★★★★★★☆☆ | 平台 / Node.js | fair-code 工作流自动化平台 | 业务流程自动化、AI Agent 接入 SaaS / API | 不是 OSI 意义上的纯开源框架，偏自动化平台 |
| LangChain | ★★★★★★★☆☆☆ | Python / JS | LLM 应用开发基础设施 | 工具调用、链式调用、与 LangGraph 配合 | 复杂 Agent 更推荐用 LangGraph 承载流程 |
| Google ADK | ★★★★★★★☆☆☆ | Python / Java | Google Agent 开发套件 | Gemini、Vertex AI、Google Cloud 生态 | 适合 Google 技术栈团队 |
| Semantic Kernel | ★★★★★★★☆☆☆ | .NET / Python / Java | AI 编排、插件、企业集成 | 已有 SK 项目、微软生态、插件化能力 | 新 Agent 项目需关注 Microsoft Agent Framework 路线 |
| Agno | ★★★★★★★☆☆☆ | Python | 高性能多模态 Agent 框架 | 多模态、快速构建 Agent 产品 | 社区和生态成熟度需结合项目判断 |
| smolagents | ★★★★★★☆☆☆☆ | Python | 轻量代码 Agent 框架 | 教学、实验、快速原型、Hugging Face 生态 | 企业复杂流程能力较有限 |
| CAMEL-AI | ★★★★★★☆☆☆☆ | Python | 多 Agent 研究与协作 | 角色扮演、多 Agent 仿真、研究实验 | 生产工程化需二次封装 |
| Make | ★★★★★★☆☆☆☆ | SaaS 平台 | 商业可视化自动化与 AI Agent 平台 | 可视化构建自动化、Agent、跨系统编排 | 非开源，不适合归入开源框架 |
| Zapier | ★★★★★★☆☆☆☆ | SaaS 平台 | 商业自动化与 AI Agent 平台 | 业务人员无代码构建跨应用自动化和 Agent | 非开源，不适合归入开源框架 |
| AutoGen | ★★★★★☆☆☆☆☆ | Python / .NET | 多 Agent 对话与协作 | 历史项目、研究、已有 AutoGen 资产 | 官方已提示维护模式，新项目需谨慎 |

## 3. 重点框架说明

### 3.1 LangGraph

LangGraph 是 LangChain 生态中面向 Agent 工作流和状态图编排的框架。它的核心优势是把 Agent 流程显式建模成图：节点表示步骤，边表示流转条件，状态在执行过程中持续传递。

适合：

- 多步骤任务拆解。
- 工具调用需要严格控制。
- Agent 需要可暂停、可恢复、可观察。
- 多 Agent 或复杂分支流程。

不适合：

- 只做一个简单聊天机器人。
- 团队希望快速上手、流程很简单。

选型建议：如果项目已经超过“单次问答 + 简单工具调用”，并且需要稳定管理状态和流程，LangGraph 是优先级很高的选择。

官方来源：

- LangGraph GitHub：https://github.com/langchain-ai/langgraph
- LangChain GitHub：https://github.com/langchain-ai/langchain

### 3.2 Microsoft Agent Framework

Microsoft Agent Framework 是微软面向企业级 Agent 应用的新一代开源框架，用于构建单 Agent、多 Agent 和 Agent 工作流。它与微软生态、Azure AI、Semantic Kernel、AutoGen 的路线关系密切。

适合：

- 企业内部系统集成。
- .NET 或 Python 技术栈。
- 需要多 Agent 编排。
- 希望对接 Azure / Microsoft 生态。

选型建议：如果团队在微软技术栈内，或者目标是企业级交付和集成，优先关注 Microsoft Agent Framework。已有 Semantic Kernel 或 AutoGen 项目也应关注迁移路线。

官方来源：

- Microsoft Agent Framework GitHub：https://github.com/microsoft/agent-framework
- Microsoft Agent Framework 文档：https://learn.microsoft.com/agent-framework/

### 3.3 CrewAI

CrewAI 的核心抽象是 Agent、Task、Crew 和 Process。它更接近“把一组角色组织起来完成任务”的开发体验，适合把业务流程拆成多个角色协作。

适合：

- 研究员、分析师、撰写者、审阅者等角色分工。
- 内容生产、报告生成、流程自动化。
- 快速搭建可演示的多 Agent 原型。

不适合：

- 状态流转特别复杂、需要强控制的生产系统。
- 对底层执行机制有非常细粒度要求的场景。

选型建议：如果业务人员容易理解“角色 + 任务 + 协作流程”，CrewAI 的沟通成本较低，适合快速验证多 Agent 业务价值。

官方来源：

- CrewAI GitHub：https://github.com/crewAIInc/crewAI
- CrewAI 文档：https://docs.crewai.com/

### 3.4 LlamaIndex Workflows / Agents

LlamaIndex 最早以数据索引和 RAG 框架闻名，现在也提供 Agent 和 Workflow 能力。它的强项是把文档、数据库、API、检索增强生成和 Agent 流程结合起来。

适合：

- 企业知识库问答。
- 文档密集型 Agent。
- 需要复杂数据连接和检索。
- RAG 与工具调用结合。

选型建议：如果 Agent 的核心价值来自“理解和使用企业数据”，LlamaIndex 通常比纯 Agent 框架更贴近需求。

官方来源：

- LlamaIndex GitHub：https://github.com/run-llama/llama_index
- LlamaIndex 文档：https://docs.llamaindex.ai/

### 3.5 OpenAI Agents SDK

OpenAI Agents SDK 是 OpenAI 官方开源 SDK，围绕 Agent、工具调用、handoff、guardrails、tracing 等能力设计。它抽象较轻，适合使用 OpenAI 模型和工具调用能力构建 Agent 应用。

适合：

- OpenAI 模型优先的项目。
- 需要轻量、官方维护的 Agent SDK。
- 需要工具调用、任务交接和追踪能力。

选型建议：如果模型层主要使用 OpenAI，并且不需要复杂图流程，OpenAI Agents SDK 是简单直接的选择。

官方来源：

- OpenAI Agents SDK GitHub：https://github.com/openai/openai-agents-python
- OpenAI Agents SDK 文档：https://openai.github.io/openai-agents-python/

### 3.6 Pydantic AI

Pydantic AI 来自 Pydantic 团队，强调类型安全、结构化输出、依赖注入和可测试性。它更像一个适合 Python 后端工程团队的 Agent 应用框架。

适合：

- Python 后端项目。
- 强依赖结构化输出。
- 希望用类型系统提升可靠性。
- 需要测试友好的 Agent 代码。

选型建议：如果你重视工程质量、类型约束和可维护性，而不是追求复杂多 Agent 编排，Pydantic AI 值得优先评估。

官方来源：

- Pydantic AI GitHub：https://github.com/pydantic/pydantic-ai
- Pydantic AI 文档：https://ai.pydantic.dev/

### 3.7 Google Agent Development Kit

Google Agent Development Kit（ADK）是 Google 面向 Agent 开发的开源框架，支持构建、评估和部署 Agent，适合 Gemini、Vertex AI 和 Google Cloud 生态。

适合：

- Gemini / Vertex AI 项目。
- Google Cloud 技术栈。
- 企业内需要与 Google 服务集成的 Agent。

选型建议：如果团队已经选择 Google AI 生态，ADK 是优先候选；如果模型和云平台无绑定，则需要与 LangGraph、OpenAI Agents SDK、Pydantic AI 等做对比。

官方来源：

- Google ADK GitHub：https://github.com/google/adk-python
- Google ADK 文档：https://google.github.io/adk-docs/

### 3.8 Haystack

Haystack 是 deepset 推出的开源 AI 编排框架，长期聚焦搜索、RAG、问答和 Pipeline。它也支持 Agent 能力，但最强场景仍是文档检索和知识问答。

适合：

- 企业搜索。
- 文档问答。
- RAG Pipeline。
- 需要可观测、可组合的数据处理流程。

选型建议：如果项目核心是“找准资料并回答”，Haystack 比单纯 Agent 框架更稳；如果核心是复杂行动和多 Agent 协作，则需要看其他框架。

官方来源：

- Haystack GitHub：https://github.com/deepset-ai/haystack
- Haystack 文档：https://docs.haystack.deepset.ai/

### 3.9 smolagents

smolagents 是 Hugging Face 推出的轻量 Agent 框架，主打简单、少抽象、容易理解。它适合做教学、实验和小型原型。

适合：

- 快速实验 Agent 思路。
- 教学和概念验证。
- Hugging Face 模型和工具生态。

选型建议：如果目标是快速理解 Agent 的基本运行方式，smolagents 很合适；如果目标是企业级复杂交付，通常还需要更完整的工程框架。

官方来源：

- smolagents GitHub：https://github.com/huggingface/smolagents
- smolagents 文档：https://huggingface.co/docs/smolagents/

### 3.10 Agno

Agno 是一个面向高性能、多模态 Agent 的 Python 框架，强调快速构建带记忆、知识库、工具和多模态能力的 Agent。

适合：

- 多模态 Agent。
- 快速搭建产品原型。
- 需要工具、记忆、知识库组合能力。

选型建议：Agno 适合快速做应用型 Agent，但在企业核心系统中采用前，需要评估团队熟悉度、社区生态、长期维护和与现有系统的集成成本。

官方来源：

- Agno GitHub：https://github.com/agno-agi/agno
- Agno 文档：https://docs.agno.com/

### 3.11 CAMEL-AI

CAMEL-AI 更偏多 Agent 研究和实验框架，强调角色扮演、Agent 社会模拟、多 Agent 协作和数据生成。

适合：

- 多 Agent 研究。
- 角色协作实验。
- Agent 社会模拟。
- 学术和原型探索。

选型建议：如果目标是研究多 Agent 协作模式，CAMEL-AI 很有价值；如果目标是企业生产交付，需要额外评估工程化和运维能力。

官方来源：

- CAMEL-AI GitHub：https://github.com/camel-ai/camel
- CAMEL-AI 文档：https://docs.camel-ai.org/

### 3.12 AutoGen

AutoGen 是微软较早推出的多 Agent 对话与协作框架，影响力很大。但需要注意，微软官方仓库目前已提示 AutoGen 进入维护模式，并推荐新项目关注 Microsoft Agent Framework。

适合：

- 已有 AutoGen 项目维护。
- 多 Agent 对话研究。
- 需要复用历史生态或示例。

选型建议：新项目不建议只因为知名度选择 AutoGen。应优先评估 Microsoft Agent Framework、LangGraph、CrewAI 等更适合当前路线的框架。

官方来源：

- AutoGen GitHub：https://github.com/microsoft/autogen
- Microsoft Agent Framework GitHub：https://github.com/microsoft/agent-framework

### 3.13 Dify、n8n、Zapier、Make 算 Agent 开发框架吗？

结论：要分层看。

| 工具 | 是否能开发 Agent | 是否属于本文核心“开源 Agent 开发框架” | 更准确分类 |
| --- | --- | --- | --- |
| Dify | 是 | 部分算 | 开源 LLM 应用开发平台 / 低代码 Agent 平台 |
| n8n | 是 | 边界型，不完全算 | fair-code / source-available 工作流自动化与 AI Agent 编排平台 |
| Zapier | 是 | 不算 | 商业 SaaS 自动化与 AI Agent 平台 |
| Make | 是 | 不算 | 商业可视化自动化与 AI Agent 平台 |

#### Dify

Dify 官方定位是开源 LLM 应用开发平台，包含 AI Workflow、RAG pipeline、Agent 能力、模型管理和可观测能力。它能用于构建 Agent，也能构建聊天应用、知识库问答、工作流应用等。

适合：

- 快速搭建可用的 LLM 应用。
- 低代码构建 RAG、Workflow、Agent。
- 需要应用后台、模型管理、运行日志和团队协作。
- 业务团队和工程团队共同迭代 AI 应用。

选型判断：Dify 可以算“Agent 应用开发平台”，但不是 LangGraph 这类代码优先的 Agent 编排框架。如果目标是快速交付应用和运营后台，Dify 很合适；如果目标是深度控制状态机、节点执行和工程代码边界，LangGraph 更合适。

官方来源：

- Dify GitHub：https://github.com/langgenius/dify
- Dify Workflow Studio：https://dify.ai/workflows

#### n8n

n8n 官方定位是 workflow automation tool，支持 AI 能力和业务流程自动化，也提供 AI Agent builder。它的优势在于把 Agent 接入大量业务系统、SaaS、API 和自动化流程。

适合：

- 把 AI Agent 接入 CRM、邮件、表格、工单、数据库等业务系统。
- 技术团队用低代码 + 代码节点快速搭建自动化。
- 需要自托管、隐私控制和大量集成。
- 把确定性流程和 AI 判断结合起来。

选型判断：n8n 可以构建 Agentic Workflow，但它更像自动化编排平台，不是纯 Agent 开发框架。并且 n8n 是 fair-code / source-available 授权，不应简单写成传统意义上的开源框架。

官方来源：

- n8n 文档：https://docs.n8n.io/
- n8n AI Agents：https://n8n.io/ai-agents/
- n8n License 说明：https://support.n8n.io/article/can-i-use-your-license-for-my-use-case

#### Zapier

Zapier 是商业 SaaS 自动化平台。Zapier Agents 可以创建能使用 Zapier 数千个应用集成来完成任务的 AI Agent。

适合：

- 业务人员无代码搭建自动化。
- 快速连接常见 SaaS 应用。
- 内部运营、销售、市场、客服等轻量 Agent 场景。

选型判断：Zapier 能构建 Agent，但不是开源 Agent 开发框架。它更适合被归类为“商业自动化平台 + AI Agent 能力”。

官方来源：

- Zapier Agents 文档：https://help.zapier.com/hc/en-us/articles/24393442652557-Build-an-agent-in-Zapier-Agents

#### Make

Make 是商业可视化自动化平台，官方已经提供 Make AI Agents，用于在 Make 画布中构建可复用、可观测、可接入 3000+ 应用的 AI Agent。

适合：

- 可视化编排跨系统业务流程。
- 把 AI 判断嵌入已有自动化。
- 需要透明执行过程、人工控制和团队复用。

选型判断：Make 能构建 AI Agent，但不是开源开发框架。它适合业务自动化和可视化编排，不适合作为代码层 Agent 框架来选型。

官方来源：

- Make AI Agents：https://www.make.com/en/ai-agents
- Make Help Center：https://help.make.com/make-ai-agents-the-next-step-in-automation

## 4. 按能力维度对比

| 维度 | LangGraph | CrewAI | Microsoft Agent Framework | LlamaIndex | OpenAI Agents SDK | Pydantic AI | Haystack |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 多步骤流程控制 | 强 | 中 | 强 | 中 | 中 | 中 | 中 |
| 多 Agent 协作 | 强 | 强 | 强 | 中 | 中 | 弱到中 | 弱到中 |
| RAG / 知识库 | 中 | 中 | 中 | 强 | 中 | 中 | 强 |
| 企业系统集成 | 中 | 中 | 强 | 中 | 中 | 中 | 强 |
| 类型安全 / 工程质量 | 中 | 中 | 中 | 中 | 中 | 强 | 中 |
| 快速原型 | 中 | 强 | 中 | 中 | 强 | 强 | 中 |
| 复杂生产工作流 | 强 | 中 | 强 | 中 | 中 | 中 | 中 |
| 学习成本 | 中高 | 低中 | 中 | 中 | 低中 | 低中 | 中 |

## 5. 选型建议

### 5.1 企业项目优先看这几类

企业真实项目通常不只是让 Agent “会聊天”，而是要考虑权限、流程、稳定性、审计、错误处理、可观测性和交付责任。

优先级建议：

1. 复杂流程和状态控制：LangGraph。
2. 微软生态和企业集成：Microsoft Agent Framework。
3. 知识库和文档问答：LlamaIndex 或 Haystack。
4. OpenAI 模型优先、轻量 Agent：OpenAI Agents SDK。
5. Python 工程质量和结构化输出：Pydantic AI。

### 5.2 原型验证可以更轻

如果目标是快速验证业务价值，不必一开始就使用最复杂的框架。

推荐：

- 多角色任务协作：CrewAI。
- 轻量教学和实验：smolagents。
- 多模态原型：Agno。
- 多 Agent 研究：CAMEL-AI。

### 5.3 不建议只看 Star 数选型

AI Agent 框架变化很快，GitHub Star 数只能说明关注度，不能说明：

- 是否适合生产。
- 是否方便调试。
- 是否适合团队技术栈。
- 是否具备权限控制和审计能力。
- 是否能和现有业务系统集成。

更合理的选型方式是先明确业务问题：

1. Agent 是否需要调用真实业务系统？
2. 是否涉及写操作、审批或资金风险？
3. 是否需要多 Agent 协作？
4. 是否需要强 RAG 能力？
5. 是否需要人工确认和回滚机制？
6. 团队主语言是 Python、JavaScript、.NET 还是 Java？
7. 目标云生态是 OpenAI、Azure、Google Cloud，还是私有化模型？

## 6. 推荐技术路线

### 路线 A：通用 Python Agent 应用

推荐组合：

- LangGraph：负责复杂流程和状态控制。
- LangChain：负责模型、工具、集成生态。
- LangSmith 或自建日志：负责调试和可观测。

适合：复杂业务流程、工具调用、多步骤任务。

### 路线 B：知识库 / 文档问答 Agent

推荐组合：

- LlamaIndex 或 Haystack：负责数据连接、索引、检索和 RAG。
- Pydantic AI 或 OpenAI Agents SDK：负责 Agent 层和结构化输出。

适合：企业知识库、制度问答、项目资料检索、客服辅助。

### 路线 C：微软企业生态

推荐组合：

- Microsoft Agent Framework：负责 Agent 和多 Agent 编排。
- Azure AI Foundry / Azure OpenAI：负责模型和平台能力。
- Semantic Kernel：用于已有插件和编排资产延续。

适合：企业内部系统、微软技术栈、Azure 生态。

### 路线 D：快速验证多 Agent 业务价值

推荐组合：

- CrewAI：负责角色、任务和协作流程。
- LlamaIndex：需要知识库时加入。

适合：报告生成、市场分析、需求分析、流程自动化原型。

## 7. 总结

当前开源 AI Agent 框架大致分成四类：

1. 流程编排型：LangGraph、Microsoft Agent Framework。
2. 多角色协作型：CrewAI、CAMEL-AI、AutoGen。
3. 数据 / RAG 型：LlamaIndex、Haystack。
4. 轻量工程型：OpenAI Agents SDK、Pydantic AI、smolagents、Agno。

如果把低代码平台和自动化平台也纳入广义 Agent 开发工具，可以再补一类：

5. Agent 应用平台 / 自动化编排平台：Dify、n8n、Zapier、Make。

其中 Dify 更接近开源 LLM 应用与 Agent 平台；n8n 更接近 source-available 工作流自动化与 AI Agent 编排平台；Zapier 和 Make 是商业 SaaS 自动化平台，虽然能构建 Agent，但不属于本文核心意义上的开源 Agent 开发框架。

如果没有特殊生态绑定，比较稳妥的选型顺序是：

1. 复杂生产流程：LangGraph。
2. 企业微软生态：Microsoft Agent Framework。
3. 知识库和 RAG：LlamaIndex / Haystack。
4. OpenAI 模型优先：OpenAI Agents SDK。
5. Python 类型安全工程：Pydantic AI。
6. 快速多角色原型：CrewAI。

最终选型不要从框架出发，而要从业务问题出发：Agent 要完成什么任务、能访问什么系统、能做哪些动作、失败如何回滚、什么时候必须让人确认。

如果团队主要是工程开发者，且需要深度控制状态、代码结构、测试和部署，优先从 LangGraph、Pydantic AI、OpenAI Agents SDK、CrewAI 等代码框架选型。

如果团队主要目标是快速搭建可运营的 AI 应用、知识库问答或工作流应用，可以评估 Dify。

如果核心需求是把 AI Agent 接入大量 SaaS、内部系统和自动化流程，可以评估 n8n、Zapier、Make；但要把它们视为自动化平台选型，而不是开源 Agent 框架选型。

## 8. 参考链接

- LangGraph：https://github.com/langchain-ai/langgraph
- LangChain：https://github.com/langchain-ai/langchain
- Microsoft Agent Framework：https://github.com/microsoft/agent-framework
- Microsoft Agent Framework 文档：https://learn.microsoft.com/agent-framework/
- Semantic Kernel：https://github.com/microsoft/semantic-kernel
- CrewAI：https://github.com/crewAIInc/crewAI
- CrewAI 文档：https://docs.crewai.com/
- LlamaIndex：https://github.com/run-llama/llama_index
- LlamaIndex 文档：https://docs.llamaindex.ai/
- OpenAI Agents SDK：https://github.com/openai/openai-agents-python
- OpenAI Agents SDK 文档：https://openai.github.io/openai-agents-python/
- Google ADK：https://github.com/google/adk-python
- Google ADK 文档：https://google.github.io/adk-docs/
- Pydantic AI：https://github.com/pydantic/pydantic-ai
- Pydantic AI 文档：https://ai.pydantic.dev/
- Haystack：https://github.com/deepset-ai/haystack
- Haystack 文档：https://docs.haystack.deepset.ai/
- smolagents：https://github.com/huggingface/smolagents
- smolagents 文档：https://huggingface.co/docs/smolagents/
- Agno：https://github.com/agno-agi/agno
- Agno 文档：https://docs.agno.com/
- CAMEL-AI：https://github.com/camel-ai/camel
- CAMEL-AI 文档：https://docs.camel-ai.org/
- AutoGen：https://github.com/microsoft/autogen
- Dify：https://github.com/langgenius/dify
- Dify Workflow Studio：https://dify.ai/workflows
- n8n 文档：https://docs.n8n.io/
- n8n AI Agents：https://n8n.io/ai-agents/
- n8n License 说明：https://support.n8n.io/article/can-i-use-your-license-for-my-use-case
- Zapier Agents：https://help.zapier.com/hc/en-us/articles/24393442652557-Build-an-agent-in-Zapier-Agents
- Make AI Agents：https://www.make.com/en/ai-agents
- Make AI Agents Help Center：https://help.make.com/make-ai-agents-the-next-step-in-automation
