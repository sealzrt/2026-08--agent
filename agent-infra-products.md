# Agent Infra 产品与开源项目

截至 2026-08-10，agent infra 还不是一个严格标准化品类。可以按这几层理解：

- Agent 开发框架
- 托管运行时
- 沙箱/工具执行
- 状态/记忆
- 评测观测
- 权限治理
- 低代码工作流平台

## 商业/托管产品

| 产品 | 主要定位 | 开源吗 |
| --- | --- | --- |
| Claude Managed Agents | Anthropic 托管 Agent harness，支持长任务、会话状态、云沙箱/自托管沙箱 | 否，托管服务 |
| Amazon Bedrock Agents | AWS 上配置 Agent、RAG、API action、memory | 否 |
| Amazon Bedrock AgentCore | 更底层的 Agent runtime/memory/registry，支持任意框架和模型 | 否 |
| Microsoft Foundry Agent Service / Hosted Agents | 托管 Agent 服务，可跑自定义容器/框架，有隔离 session 沙箱 | 否 |
| Google Vertex AI Agent Engine / Gemini Enterprise Agent Platform | Google Cloud 上部署、管理、扩缩 Agent | 否；但 Google ADK 是开源 |
| Snowflake Cortex Agents | Snowflake 内部的托管 agentic data 平台 | 否 |
| Databricks Mosaic AI Agents | Databricks 上构建、评估、部署 Agent | 否 |
| IBM watsonx Orchestrate | 企业 Agent 控制面、多 Agent 编排、治理 | 否 |
| Salesforce Agentforce | CRM/业务系统里的 Agent 平台 | 否 |
| ServiceNow AI Agent Studio | 在 Now Platform 里创建、管理、测试 AI agents/workflows | 否 |
| OpenAI Agents 平台 / Responses API / hosted tools | Agent SDK + OpenAI 托管工具能力 | SDK 开源，平台服务不开源 |

## 开源/可自托管项目

| 项目 | 适合做什么 | License/备注 |
| --- | --- | --- |
| OpenHands | 最像“开源版 coding agent 平台”，有 CLI/Web/SDK/REST、Docker sandbox | 核心 MIT，企业目录另有商业限制 |
| LangGraph | 状态机式 Agent 编排、memory、human-in-loop、多 Agent 图 | MIT |
| Microsoft Agent Framework | Python/.NET 生产级 Agent、多 Agent workflow | MIT |
| Google ADK | Google 的开源 Agent Development Kit，多语言、多 Agent、评测/部署 | Apache 2.0 |
| OpenAI Agents SDK | 轻量多 Agent workflow、handoff、guardrail、tracing | MIT |
| Strands Agents | AWS 体系开源 Agent SDK，Python/TypeScript，MCP/A2A/OTel | Apache 2.0 |
| CrewAI | 多角色 Agent 协作、Crew/Flow 编排 | MIT |
| LlamaIndex | RAG、数据 Agent、文档 Agent | MIT |
| Haystack | RAG/Agent pipeline、检索、路由、工具调用 | Apache 2.0 |
| Letta | 长期记忆、stateful agents | Apache 2.0 |
| Pydantic AI | Python 类型安全 Agent 框架 | MIT |
| Agno | Python Agent framework，memory/tools/knowledge | Apache 2.0 |
| Mastra | TypeScript Agent/workflow/RAG/evals | 核心 Apache 2.0，EE 商业 |
| Flowise | 可视化低代码 Agent/RAG/workflow | Apache 2.0 |
| Langflow | 可视化 AI app/Agent/workflow builder | MIT |
| Dify | AI 应用平台、Agent、Workflow、RAG、管理 UI | 源码开放，但 license 有额外限制，不算纯 OSI 开源 |
| n8n | AI workflow / agent automation，集成很多业务系统 | source-available，Sustainable Use License，不算纯 OSI 开源 |
| AutoGen | 老牌多 Agent 框架 | 现在维护模式，新项目更建议 Microsoft Agent Framework |
| E2B | Agent 代码执行 sandbox | Apache 2.0 |
| Microsandbox | 本地/自托管 Agent sandbox runtime | Apache 2.0 |
| OpenSandbox / Agent-Sandbox / AIO Sandbox | Agent 沙箱、shell/browser/file/MCP 环境 | 多数 Apache 2.0 |
| Langfuse | Agent/LLM tracing、eval、prompt 管理 | 核心 MIT，EE 商业 |
| Phoenix | AI observability/evaluation | ELv2，可免费自托管但不是宽松 OSI 许可证 |

## 选型建议

- 要搭类似 Claude Managed Agents 的开源 infra：优先看 OpenHands + E2B/Microsandbox + Langfuse/Phoenix。
- 要做业务 Agent 平台：看 LangGraph / Microsoft Agent Framework / Google ADK / Strands，再结合 Temporal/Kubernetes 做长任务和调度。
- 要快速做内部工具和工作流：看 Dify / Flowise / Langflow / n8n。
- 要做 coding agent 平台：OpenHands 是最接近的完整开源入口。
- 要做可控的生产级 agent runtime：LangGraph、Microsoft Agent Framework、Google ADK、Strands 更适合作为底层框架。

## 参考链接

- Claude Managed Agents: https://platform.claude.com/docs/en/managed-agents/overview
- Amazon Bedrock AgentCore: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html
- Microsoft Foundry Hosted Agents: https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/hosted-agents
- Google Vertex AI Agent Engine: https://cloud.google.com/vertex-ai/generative-ai/docs/reasoning-engine/overview
- Snowflake Cortex Agents: https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents
- Databricks Mosaic AI Agents: https://docs.databricks.com/aws/en/agents
- IBM watsonx Orchestrate: https://www.ibm.com/products/watsonx-orchestrate
- ServiceNow AI Agent Studio: https://www.servicenow.com/docs/r/intelligent-experiences/ai-agent-studio.html
- OpenHands: https://github.com/OpenHands/OpenHands
- LangGraph: https://www.langchain.com/langgraph
- Microsoft Agent Framework: https://github.com/microsoft/agent-framework
- Google ADK: https://github.com/google/adk-python
- OpenAI Agents SDK: https://github.com/openai/openai-agents-python
- Strands Agents: https://github.com/strands-agents
- CrewAI: https://github.com/crewAIInc/crewAI
- LlamaIndex: https://github.com/run-llama/llama_index
- Haystack: https://github.com/deepset-ai/haystack
- Letta: https://github.com/letta-ai/letta
- Flowise: https://github.com/FlowiseAI/Flowise
- Langflow: https://github.com/langflow-ai/langflow
- E2B: https://github.com/e2b-dev/E2B
- Langfuse: https://github.com/langfuse/langfuse
