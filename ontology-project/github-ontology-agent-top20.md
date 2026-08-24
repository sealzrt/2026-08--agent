# 本体论 + Agent 开源项目 Top 50

> 更新时间：2026-08-24  
> 搜索关键词：`ontology agent` / `ontology LLM` / `ontology knowledge graph agent` / `ontology semantic agent` / `ontology reasoning agent` / `本体 agent` / `ontology semantic web agent` / `ontological agent`（8 组关键词合并去重）  
> 排序方式：按 Stars 从高到低  
> 筛选标准：**本体论落地**（真正实现本体工程/本体学习/本体驱动，而非仅概念）+ **可与 Agent 结合**（MCP / LangChain / LangGraph / Agent 框架 / 知识图谱供 Agent 使用）

---

## 完整列表

**图例**：
- 本体论落地：🟢高（本体是核心交付物）/ 🟡中（本体是重要组成部分）/ ⚪低（本体仅附属概念）
- Agent 结合：🔵强（原生 MCP/Agent 框架）/ 🔷中（可嵌入）/ ⚪弱（库/研究代码，需自行集成）

| # | Stars | 项目 | 本体论落地 | Agent结合 | 描述 |
|---|-------|------|:---:|:---:|------|
| 1 | 10619 | [semantica-agi/semantica](https://github.com/semantica-agi/semantica) | 🟡 | 🔵 | Graph-Native Infrastructure：为上下文与可问责 AI 系统提供图原生基础设施 |
| 2 | 2597 | [trustgraph-ai/trustgraph](https://github.com/trustgraph-ai/trustgraph) | 🟡 | 🔵 | 超图驱动的上下文互操作层，构建统一语义上下文层 |
| 3 | 978 | [monarch-initiative/ontogpt](https://github.com/monarch-initiative/ontogpt) | 🟢 | 🔷 | LLM 本体化抽取工具（生物医学领域权威，含 SPIRES），基于本体 grounding 抽取结构化信息 |
| 4 | 684 | [jonexaiorg/jonex](https://github.com/jonexaiorg/jonex) | 🟢 | 🔵 | 多模态解析引擎 + 本体驱动、LLM Wiki 驱动的 AI-Ready 知识引擎 |
| 5 | 682 | [ZJU-REAL/HugAgentOS](https://github.com/ZJU-REAL/HugAgentOS) | 🟡 | 🔵 | 自进化 AgentOS，Ontology-Grounded 可信推理（浙大），本体控制平面企业版阶段集成中 |
| 6 | 643 | [aws/context-ontology-accelerator](https://github.com/aws/context-ontology-accelerator) | 🟢 | 🔵 | AWS 官方本体语义上下文加速器：HermiT/ELK 推理、SPARQL 联邦查询、MCP Server |
| 7 | 437 | [deeplethe/ontopilot](https://github.com/deeplethe/ontopilot) | 🟢 | 🔵 | 文档→本体工作台：TBox/SKOS/ABox 三层工程 + 人工审查队列 + 版本发布 + MCP |
| 8 | 358 | [fusion-jena/automatic-KG-creation-with-LLM](https://github.com/fusion-jena/automatic-KG-creation-with-LLM) | 🟢 | 🔷 | LLM 自动构建本体与知识图谱（耶拿大学） |
| 9 | 313 | [bibinprathap/VeritasGraph](https://github.com/bibinprathap/VeritasGraph) | 🟡 | 🔵 | GraphRAG 框架：多跳推理、本体感知检索 |
| 10 | 264 | [854875058/Symbio](https://github.com/854875058/Symbio) | 🟡 | 🔵 | AI Infra 级多 Agent 协同框架：动态 DAG、本体化记忆、数据飞轮 |
| 11 | 228 | [growgraph/ontocast](https://github.com/growgraph/ontocast) | 🟢 | 🔵 | Agentic 本体辅助语义三元组抽取，本体与事实并行共进化，可嵌入 LangGraph |
| 12 | 225 | [The-Knowledge-Graph-Guys/vault-ld](https://github.com/The-Knowledge-Graph-Guys/vault-ld) | 🟡 | 🔷 | Markdown vault 作为链接数据：YAML-LD frontmatter + 共享 @context = RDF 知识图谱 |
| 13 | 203 | [XMUDeepLIT/MemGraphRAG](https://github.com/XMUDeepLIT/MemGraphRAG) | ⚪ | 🔵 | [KDD 2026] 记忆型多 Agent 图检索增强生成 |
| 14 | 184 | [mattgierhart/PRD-driven-context-engineering](https://github.com/mattgierhart/PRD-driven-context-engineering) | 🟡 | 🔷 | PRD 驱动上下文工程，本体层作为 Agent 产品基础设施 |
| 15 | 183 | [HamedBabaei/LLMs4OL](https://github.com/HamedBabaei/LLMs4OL) | 🟢 | ⚪ | LLM 本体学习范式（ISWC 论文代码）：术语类型、分类发现、关系抽取 |
| 16 | 180 | [stevereiner/flexible-graphrag](https://github.com/stevereiner/flexible-graphrag) | 🟡 | 🔵 | 灵活 GraphRAG：15 属性图 + 4 RDF + 10 向量库，支持 RDF 本体，含 MCP |
| 17 | 102 | [AlexAI-MCP/OpenCrab](https://github.com/AlexAI-MCP/OpenCrab) | 🟢 | 🔵 | MetaOntology OS MCP 插件：9 语义空间本体语法 + Neo4j 验证 + MCP 工具 |
| 18 | 100 | [shihanwan/memonto](https://github.com/shihanwan/memonto) | 🟢 | 🔵 | 用 RDF 本体 + 知识图谱增强 Agent 长期记忆，支持本体自动扩展 |
| 19 | 82 | [sciknoworg/OntoLearner](https://github.com/sciknoworg/OntoLearner) | 🟢 | 🔷 | 模块化本体学习 Python 库：150+ 本体源、4 类学习任务、LLM/RAG learner |
| 20 | 81 | [hike-lab/public-data-lens](https://github.com/hike-lab/public-data-lens) | ⚪ | 🔵 | MCP 数据发现层：帮助 Agent 查找评估开放数据集 |
| 21 | 80 | [NullLabTests/software-periodic-table](https://github.com/NullLabTests/software-periodic-table) | 🟡 | 🔵 | 115 个软件元素有限本体 + LLM 编码 Agent 组合框架 |
| 22 | 77 | [ThutmoseAI/OntoFlow](https://github.com/ThutmoseAI/OntoFlow) | 🟡 | 🔷 | 本体驱动图计算引擎：实体-组件-系统 + 流式 AI 编程 + 数字孪生 |
| 23 | 71 | [mtrnix/metronix-memory](https://github.com/mtrnix/metronix-memory) | ⚪ | 🔵 | 自托管 Agent 记忆基础设施：MCP 原生、混合 RAG |
| 24 | 59 | [aitomatic/dana](https://github.com/aitomatic/dana) | 🟢 | 🔵 | 神经符号 Agent 语言：自动从文档构建本体并演化知识图谱 |
| 25 | 56 | [LiberAI/OntoEKG](https://github.com/LiberAI/OntoEKG) | 🟢 | 🔷 | LLM 驱动企业知识图谱本体构建 |
| 26 | 47 | [HamedBabaei/LLMs4OM](https://github.com/HamedBabaei/LLMs4OM) | 🟢 | ⚪ | LLM 本体匹配（ISWC 论文代码）：RAG 方法进行本体对齐 |
| 27 | 45 | [sixb-ai/sixb](https://github.com/sixb-ai/sixb) | ⚪ | 🔵 | 构建人机共用的操作型软件框架 |
| 28 | 45 | [prototypo/ethereum-eips-ontology](https://github.com/prototypo/ethereum-eips-ontology) | 🟡 | ⚪ | Ethereum 术语本体（从 EIP 提取的领域本体数据） |
| 29 | 45 | [scottonanski/persistent-mind-model-v1.0](https://github.com/scottonanski/persistent-mind-model-v1.0) | ⚪ | 🔷 | 事件溯源 AI 身份/记忆/反思运行时 |
| 30 | 39 | [ontograph/ontoindex](https://github.com/ontograph/ontoindex) | 🟡 | 🔵 | 代码图 MCP 方案：本体 + 句子索引，支持超大代码库 |
| 31 | 39 | [KongFangXun/sofagent](https://github.com/KongFangXun/sofagent) | ⚪ | 🔵 | 企业 AI 的 FDE Agent 与约束层（git-diff 审计） |
| 32 | 39 | [tecnomod-um/OntoGenix](https://github.com/tecnomod-um/OntoGenix) | 🟢 | ⚪ | LLM 从 CSV 数据集半自动生成 OWL 本体 + RML 映射 |
| 33 | 39 | [boricles/ontosphere](https://github.com/boricles/ontosphere) | 🟢 | 🔷 | 文档→OWL/RDF 知识图谱，可视化编辑 + 语义 diff + 兼容性检查 |
| 34 | 38 | [Nayshins/ummon](https://github.com/Nayshins/ummon) | 🟡 | 🔷 | 软件工程语义层：连接代码与意义（Rust） |
| 35 | 38 | [objectstack-ai/objectstack](https://github.com/objectstack-ai/objectstack) | ⚪ | 🔵 | 数据模型/UI/工作流/权限一体化应用框架 |
| 36 | 33 | [ohdearquant/khive](https://github.com/ohdearquant/khive) | 🟡 | 🔵 | Agent 构建/查询/增长的知识图谱（Rust） |
| 37 | 33 | [vaimee/SEPA](https://github.com/vaimee/SEPA) | 🟡 | 🔵 | AI-Agent 生态语义事件总线（SPARQL 订阅） |
| 38 | 31 | [coasys/ad4m-core-deprecated](https://github.com/coasys/ad4m-core-deprecated) | 🟡 | 🔵 | Agent 中心分布式应用元本体（已弃用，历史参考） |
| 39 | 31 | [tvlnsiva/graphrag-engineering-pdfs](https://github.com/tvlnsiva/graphrag-engineering-pdfs) | 🟡 | ⚪ | 基于本体 + 知识图谱的本地 LLM RAG 示例 |
| 40 | 30 | [King-s-Knowledge-Graph-Lab/OntoChat](https://github.com/King-s-Knowledge-Graph-Lab/OntoChat) | 🟢 | 🔷 | LLM 驱动的协作式本体工程设计系统 |
| 41 | 28 | [EURAC-EEBgroup/brick-llm](https://github.com/EURAC-EEBgroup/brick-llm) | 🟢 | 🔵 | BRICK 标准本体 + LangGraph 落地（建筑领域） |
| 42 | 23 | [qzc438/ontology-llm](https://github.com/qzc438/ontology-llm) | 🟢 | 🔵 | Agent-OM：LLM Agent 本体匹配框架（论文实现） |
| 43 | 21 | [ExtensityAI/ontoloom](https://github.com/ExtensityAI/ontoloom) | 🟢 | 🔵 | OWL 2 本体构建与探索的 MCP Server |
| 44 | 20 | [senzing-garage/sz-semantics](https://github.com/senzing-garage/sz-semantics) | ⚪ | ⚪ | 实体解析 JSON → 图/语义/LLM 下游转换 |
| 45 | 20 | [sign-protocol/sign-lang](https://github.com/sign-protocol/sign-lang) | 🟡 | 🔵 | 知识契约层：Agent 企业图记号（SIGN） |
| 46 | 20 | [fabio-rovai/tardygrada](https://github.com/fabio-rovai/tardygrada) | ⚪ | 🔷 | 可信 Agent 验证运行时（8 层验证流水线） |
| 47 | 20 | [mareasw/ontoskills](https://github.com/mareasw/ontoskills) | 🟢 | 🔵 | OWL 2 Skill 编译器：SKILL.md → 校验后的 RDF/Turtle |
| 48 | 19 | [LiUSemWeb/LLMs4OntologyDev-ESWC2024](https://github.com/LiUSemWeb/LLMs4OntologyDev-ESWC2024) | 🟡 | ⚪ | ESWC 2024 LLM 本体开发教程材料 |
| 49 | 19 | [cloudbadal007/ontology-mcp-self-healing](https://github.com/cloudbadal007/ontology-mcp-self-healing) | 🟡 | 🔵 | 本体 + MCP 自愈多 Agent 系统（数据库 schema 变更自适应） |
| 50 | 17 | [yql210/ontology-driven-agent](https://github.com/yql210/ontology-driven-agent) | 🟡 | 🔵 | 本体驱动 Agent 示例项目 |

---

## 核心推荐（本体论落地 🟢 × Agent 结合 🔵 双高）

| Stars | 项目 | 推荐理由 |
|-------|------|---------|
| 978 | [monarch-initiative/ontogpt](https://github.com/monarch-initiative/ontogpt) | 权威机构（Monarch Initiative）出品，LLM + 本体 grounding 抽取，学术工业两栖 |
| 684 | [jonexaiorg/jonex](https://github.com/jonexaiorg/jonex) | 本体驱动 + 多模态解析 + LLM Wiki，AI-Ready 知识引擎，star 增长快 |
| 643 | [aws/context-ontology-accelerator](https://github.com/aws/context-ontology-accelerator) | 工业级：本体推理（HermiT/ELK）+ SPARQL + MCP，但本地部署依赖 AWS 栈 |
| 437 | [deeplethe/ontopilot](https://github.com/deeplethe/ontopilot) | 本体工程最完整：TBox/SKOS/ABox + 审查队列 + 版本发布 + MCP，本地友好 |
| 228 | [growgraph/ontocast](https://github.com/growgraph/ontocast) | 本体+事实共进化抽取，轻量本地运行，可直接嵌入 LangGraph |
| 102 | [AlexAI-MCP/OpenCrab](https://github.com/AlexAI-MCP/OpenCrab) | MCP 原生本体 OS：9 语义空间，本地 SQLite/Chroma，Agent 开箱即用 |
| 100 | [shihanwan/memonto](https://github.com/shihanwan/memonto) | RDF 本体定义 Agent 记忆，支持本体自动扩展，pip 即装 |
| 59 | [aitomatic/dana](https://github.com/aitomatic/dana) | 神经符号 Agent 语言，自动构建/演化本体，理念前沿 |
| 43 | [ExtensityAI/ontoloom](https://github.com/ExtensityAI/ontoloom) | 专为 AI Agent 构建 OWL 2 本体的 MCP Server，体积小、定位精准 |
| 41 | [EURAC-EEBgroup/brick-llm](https://github.com/EURAC-EEBgroup/brick-llm) | 标准本体（BRICK）+ LangGraph 落地结合范例 |

---

## 说明

- 数据来源：GitHub Search API 8 组关键词合并去重，共 162 个候选，过滤掉明显非本体论主题（工作流工具、电商技能、参考文献等）后取前 50
- "本体论落地"指：本体是项目的核心交付物或关键工程组件（OWL/RDF/TBox/ABox/SKOS/本体学习/本体匹配/本体驱动推理），而非仅借用"本体"一词
- Stars 数据为查询时刻的实时值
