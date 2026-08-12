# AI Infra 与 Claude Managed Agents

## AI Infra 是什么

AI infra 是支撑 AI 应用、模型训练、模型部署和模型运维的一整套基础设施。

它不是某一个工具，而是一类技术栈。可以粗略分成几层：

1. 算力基础设施
   - GPU/TPU 集群
   - 云厂商 AI 计算资源
   - Kubernetes、Ray、Slurm 等调度系统

2. 数据基础设施
   - 数据湖、数据仓库
   - 向量数据库，比如 Milvus、Pinecone、Weaviate、pgvector
   - 数据清洗、标注、版本管理

3. 模型训练基础设施
   - PyTorch、TensorFlow、JAX
   - 分布式训练框架
   - 实验管理、模型 checkpoint、训练监控

4. 模型推理基础设施
   - vLLM、TensorRT-LLM、Triton Inference Server
   - 模型压缩、量化、缓存
   - API 网关、负载均衡、弹性扩缩容

5. AI 应用基础设施
   - RAG 框架
   - Agent 框架
   - Prompt 管理
   - 工具调用、权限、记忆、评测系统

6. 运维和治理
   - 模型监控
   - 成本控制
   - 安全审计
   - 内容安全
   - 模型评估和回归测试

一句话：AI infra 就是让 AI 模型能被训练、部署、调用、监控、扩展、治理的底层工程体系。

如果拿 Web 开发类比：普通后端 infra 支撑网站运行；AI infra 支撑大模型和 AI 应用运行。

## Claude Managed Agents 是什么

Claude Managed Agents 是 Anthropic 的一个托管 Agent 平台/API。

简单说，你不用自己搭 agent loop、沙箱、工具执行、状态存储、权限、调度这些 infra，Anthropic 给你提供一套托管环境。你定义：

- Agent：模型、system prompt、工具、MCP、skills
- Environment：运行环境，Anthropic 云沙箱或自托管沙箱
- Session：一次具体任务执行
- Events：你和 agent 之间的消息、状态、结果

它适合长时间异步任务，比如自动跑代码任务、定时报告、数据处理、多 agent 流程等。

Claude Managed Agents 本身不是开源项目，而是 Anthropic 的闭源/托管商业服务。目前官方文档描述它处于 beta，需要 Claude API key 和 beta header。

不过它支持 self-hosted sandboxes，也就是 Anthropic 仍负责控制面和模型编排，但工具执行、文件系统、网络访问可以跑在你自己的基础设施里。

## 类似 Claude Managed Agents 的开源框架

没有一个完全等价的开源版 Claude Managed Agents。开源框架通常覆盖其中一部分能力，比如 Agent runtime、状态持久化、工具调用、沙箱、多 Agent 编排或管理界面。

| 项目 | 更像 Claude Managed Agents 的哪部分 | 开源情况 |
| --- | --- | --- |
| OpenHands | 最接近“代码 Agent 平台”：CLI、Web GUI、SDK、REST API、Docker sandbox、可自托管 | 核心 MIT，企业目录另有商业限制 |
| Microsoft Agent Framework | 生产级 Agent / 多 Agent 编排 SDK，支持 Python/.NET、工作流、checkpoint、human-in-loop | MIT |
| LangGraph | 状态机式 Agent 编排：状态、memory、streaming、human-in-loop、多 Agent 图 | MIT 开源库 |
| Dify | 低代码 AI 应用平台：Agent、Workflow、RAG、模型管理、日志观测、API 发布 | 源码开放，Dify Open Source License，基于 Apache 2.0 但有额外限制 |
| Letta | 长期状态 Agent、记忆、Agent API、CLI/本地运行 | Apache-2.0 |
| CrewAI | 多 Agent 角色协作、任务编排、工具/MCP、异步流程 | MIT |
| Temporal | 长任务、可恢复执行、重试、调度、状态持久化 | MIT；不是 Agent 框架，但适合做 Agent 后台任务 infra |

## 选型建议

- 想要最像 Claude Managed Agents 的“可跑代码任务的平台”：先看 OpenHands。
- 想做自己的 Agent 后端/平台：用 LangGraph 或 Microsoft Agent Framework，加 Temporal 做长任务和可靠调度。
- 想快速搭 AI 应用、RAG、工作流、管理界面：看 Dify。
- 重点是长期记忆、持久人格、会话状态：看 Letta。
- 重点是多 Agent 分工协作 demo 或业务流程：看 CrewAI。

## 参考链接

- Claude Managed Agents overview: https://platform.claude.com/docs/en/managed-agents/overview
- Claude Managed Agents self-hosted sandboxes: https://platform.claude.com/docs/en/managed-agents/self-hosted-sandboxes
- OpenHands: https://github.com/OpenHands/OpenHands
- Microsoft Agent Framework: https://github.com/microsoft/agent-framework
- LangGraph: https://www.langchain.com/langgraph
- Dify: https://github.com/langgenius/dify
- Letta: https://github.com/letta-ai/letta
- CrewAI: https://github.com/crewAIInc/crewAI
- Temporal: https://temporal.io/
