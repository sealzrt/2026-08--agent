# 本体驱动的项目实施全链路风险管控：50 个开源项目评分报告

> 评估日期：2026-08-24
> 评估背景：[项目风险管控工具设计方案-v0.4](../Ontology/方案/项目风险管控工具设计方案-v0.4.md)（本体驱动的售前→实施→运维质保全链路风险管控工具）
> 参考输入：[软件开发合同](../Ontology/方案/软件开发合同.md)（付款节点/功能清单/里程碑/变更/违约/验收/SLA 等风险要素）
> 评估对象：[github-ontology-agent-top20.md](./github-ontology-agent-top20.md) 中 Top 50 开源项目

---

## 一、评分标准（总分 50 = 5 维度 × 10 分）

| 维度 | 满分 | 考察什么 |
|------|:---:|------|
| ① 本体落地度 | 10 | 本体是否是项目核心（OWL/RDF/建模/学习/匹配/推理），能否支撑工具的本体模型（15 类/16 关系/18 属性） |
| ② 场景适配度 | 10 | 对全链路（售前/合同/计划/进度/需求/方案/风险/运维）风险管控的支撑：五类输入文档处理、风险识别、链路传导 |
| ③ 本地集成度 | 10 | 能否本地运行、能否以库/MCP/API 形式集成进 Nuxt 3 + SQLite 工具链 |
| ④ 成熟度 | 10 | Stars、维护状态、文档、机构背书、许可证（停更/教学项目扣分） |
| ⑤ 风险识别能力 | 10 | 对应四层识别架构：L1 规则引擎 / L2 关系推演 / L3 阈值信号 / L4 LLM 辅助，含审计追溯 |

> 说明：评估立足"为本工具选型/借鉴"，分数代表**对本项目的适配价值**，非项目本身优劣。

---

## 二、完整排名表（按总分降序）

| 排名 | 项目 | Stars | ①本体 | ②场景 | ③集成 | ④成熟 | ⑤识别 | 总分 | 一句话理由 |
|:---:|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|------|
| 1 ⭐ | [context-ontology-accelerator](https://github.com/aws/context-ontology-accelerator) | 643 | 9 | 7 | 7 | 8 | 8 | **39** | 规则+推理+SPARQL+MCP 四件套，对应 L1/L2 识别；AWS 背书，部署偏云 |
| 2 ⭐ | [ontopilot](https://github.com/deeplethe/ontopilot) | 437 | 10 | 8 | 8 | 6 | 7 | **39** | 文档→本体→审核→发布→MCP 全流水线，与五类输入→本体同构；社区小 |
| 3 ⭐ | [ontocast](https://github.com/growgraph/ontocast) | 228 | 9 | 8 | 8 | 6 | 8 | **39** | 边抽事实边建本体=要素抽取+本体入库流水线核心组件，可嵌入 Nitro |
| 4 ⭐ | [semantica](https://github.com/semantica-agi/semantica) | 10619 | 7 | 6 | 8 | 9 | 8 | **38** | 最大社区：决策可查可审=风险审计追溯底座；但非 OWL 本体，领域本体需自建 |
| 5 ⭐ | [HugAgentOS](https://github.com/ZJU-REAL/HugAgentOS) | 682 | 8 | 9 | 6 | 7 | 8 | **38** | 本体做控制平面拦截违规=风险自动管控直接示范，方案 5.1 已引用；改造重 |
| 6 ⭐ | [ontogpt](https://github.com/monarch-initiative/ontogpt) | 978 | 9 | 6 | 7 | 8 | 7 | **37** | LLM 按本体抽取=文档要素抽取（L4）最强组件；生物医学领域需迁移 |
| 7 ⭐ | [trustgraph](https://github.com/trustgraph-ai/trustgraph) | 2597 | 7 | 7 | 7 | 8 | 7 | **36** | 跨系统一致性验证=合同与进度对账、SLA 履约检测；超图非 OWL，落地需桥接 |
| 8 ⭐ | [jonex](https://github.com/jonexaiorg/jonex) | 684 | 7 | 8 | 8 | 7 | 6 | **36** | 合同/需求文档→本体→知识库成品，五类输入知识化可直接用；本体较轻 |
| 9 ⭐ | [automatic-KG-creation-with-LLM](https://github.com/fusion-jena/automatic-KG-creation-with-LLM) | 358 | 9 | 6 | 7 | 7 | 7 | **36** | LLM 全自动建本体+KG，快速生成种子本体；质量需人工校验 |
| 10 ⭐ | [OpenCrab](https://github.com/AlexAI-MCP/OpenCrab) | 102 | 9 | 7 | 8 | 5 | 7 | **36** | 9 语义空间+MCP 插座：本体能力即插即用接入工具；社区小 |
| 11 ⭐ | [PRD-driven-context-engineering](https://github.com/mattgierhart/PRD-driven-context-engineering) | 184 | 8 | 8 | 7 | 5 | 7 | **35** | PRD→本体→照图干活：需求/范围管控直接对应，范围蔓延可拦截 |
| 12  | [VeritasGraph](https://github.com/bibinprathap/VeritasGraph) | 313 | 6 | 7 | 7 | 6 | 8 | **34** | 答案自带证据链=风险溯源审计；本体为轻量图 |
| 13  | [flexible-graphrag](https://github.com/stevereiner/flexible-graphrag) | 180 | 6 | 6 | 9 | 6 | 7 | **34** | 15 图库+4 RDF+10 向量库+MCP+UI：存储层兼容性最强，本地集成首选 |
| 14  | [Symbio](https://github.com/854875058/Symbio) | 264 | 7 | 6 | 6 | 6 | 8 | **33** | 神经符号安全约束=Agent 行为风险管控；国产社区，改造需评估 |
| 15  | [OntoLearner](https://github.com/sciknoworg/OntoLearner) | 82 | 9 | 5 | 7 | 5 | 6 | **32** | 本体学习工具箱：150+ 源统一接口，可作本体构建管线 |
| 16  | [dana](https://github.com/aitomatic/dana) | 59 | 8 | 7 | 5 | 5 | 7 | **32** | 边干活边建/改本体=风险规则自动演进；语言栈改造成本高 |
| 17  | [memonto](https://github.com/shihanwan/memonto) | 100 | 8 | 6 | 7 | 5 | 5 | **31** | Agent 记忆按本体归档，可参考风险台账建模；自动扩展本体有趣 |
| 18  | [OntoGenix](https://github.com/tecnomod-um/OntoGenix) | 39 | 9 | 6 | 6 | 4 | 6 | **31** | CSV/Excel→OWL 本体+映射规则：正好匹配 M3 数据导入→本体 |
| 19  | [ontosphere](https://github.com/boricles/ontosphere) | 39 | 9 | 7 | 6 | 4 | 5 | **31** | 可视化本体建模画板=本体建模工作台（M2）参考 |
| 20  | [SEPA](https://github.com/vaimee/SEPA) | 33 | 7 | 7 | 6 | 5 | 6 | **31** | 语义事件总线=风险事件传导（L2 联动）机制参考 |
| 21  | [ontoloom](https://github.com/ExtensityAI/ontoloom) | 21 | 9 | 6 | 8 | 3 | 5 | **31** | 最纯 OWL MCP：Agent 直接建/查本体=本体建模 API 化 |
| 22  | [LLMs4OL](https://github.com/HamedBabaei/LLMs4OL) | 183 | 9 | 4 | 6 | 6 | 5 | **30** | 本体学习基准：选型 LLM 识别能力时当"考卷"；非产品 |
| 23  | [OntoFlow](https://github.com/ThutmoseAI/OntoFlow) | 77 | 8 | 6 | 5 | 4 | 7 | **30** | 实时数据流图计算=L3 数据信号检测思路；项目年轻 |
| 24  | [sofagent](https://github.com/KongFangXun/sofagent) | 39 | 4 | 8 | 6 | 4 | 8 | **30** | 规则审计+快照回滚=企业 AI 安全带，理念最贴近风险管控；本体弱 |
| 25  | [OntoEKG](https://github.com/LiberAI/OntoEKG) | 56 | 8 | 6 | 6 | 4 | 5 | **29** | 按企业数据定制本体：领域本体生成思路可用 |
| 26  | [LLMs4OM](https://github.com/HamedBabaei/LLMs4OM) | 47 | 9 | 4 | 6 | 5 | 5 | **29** | 本体匹配：合并两套本体时有用；核心场景关联弱 |
| 27  | [OntoChat](https://github.com/King-s-Knowledge-Graph-Lab/OntoChat) | 30 | 9 | 6 | 5 | 4 | 5 | **29** | 聊天建本体：让业务专家参与建模，降低门槛 |
| 28  | [MemGraphRAG](https://github.com/XMUDeepLIT/MemGraphRAG) | 203 | 6 | 5 | 6 | 6 | 5 | **28** | 多 Agent 共享记忆图谱，可参考风险知识积累；本体弱 |
| 29  | [ontology-mcp-self-healing](https://github.com/cloudbadal007/ontology-mcp-self-healing) | 19 | 8 | 6 | 5 | 3 | 6 | **28** | 库表变化→本体自适应：风险规则自动更新的自愈思路 |
| 30  | [vault-ld](https://github.com/The-Knowledge-Graph-Guys/vault-ld) | 225 | 7 | 4 | 6 | 6 | 4 | **27** | 笔记→RDF 思路可借鉴文档语义化；场景距离项目管控较远 |
| 31  | [metronix-memory](https://github.com/mtrnix/metronix-memory) | 71 | 5 | 5 | 8 | 5 | 4 | **27** | 自托管 MCP 记忆服务：本地集成容易；与本体/风险弱相关 |
| 32  | [brick-llm](https://github.com/EURAC-EEBgroup/brick-llm) | 28 | 8 | 5 | 5 | 4 | 5 | **27** | 成熟领域本体+Agent 示范：本体资产范例 |
| 33  | [persistent-mind-model-v1.0](https://github.com/scottonanski/persistent-mind-model-v1.0) | 45 | 6 | 5 | 5 | 4 | 6 | **26** | 事件化可审计=操作留痕思路；与风险管控场景需改造 |
| 34  | [ontoindex](https://github.com/ontograph/ontoindex) | 39 | 7 | 4 | 7 | 4 | 4 | **26** | 代码→本体+索引 MCP：技术方案文档分析可借鉴 |
| 35  | [ummon](https://github.com/Nayshins/ummon) | 38 | 7 | 4 | 6 | 4 | 5 | **26** | 代码语义层：技术方案/代码库理解辅助 |
| 36  | [khive](https://github.com/ohdearquant/khive) | 33 | 6 | 5 | 6 | 4 | 5 | **26** | Agent 自建/查/扩知识图谱：风险知识积累思路 |
| 37  | [ontology-llm](https://github.com/qzc438/ontology-llm) | 23 | 9 | 4 | 5 | 3 | 5 | **26** | Agent 谈判匹配本体：自动化本体对齐思路 |
| 38  | [tardygrada](https://github.com/fabio-rovai/tardygrada) | 20 | 4 | 6 | 5 | 3 | 8 | **26** | 8 层论断验证=AI 输出可信度校验，可作 L4 结果把关 |
| 39  | [LLMs4OntologyDev-ESWC2024](https://github.com/LiUSemWeb/LLMs4OntologyDev-ESWC2024) | 19 | 8 | 4 | 6 | 4 | 4 | **26** | ESWC 顶会教程：团队学习 LLM 建本体的教材 |
| 40  | [software-periodic-table](https://github.com/NullLabTests/software-periodic-table) | 80 | 6 | 5 | 5 | 5 | 4 | **25** | 软件零件库：技术方案组件化检测可借鉴；本体轻 |
| 41  | [sixb](https://github.com/sixb-ai/sixb) | 45 | 5 | 6 | 5 | 4 | 5 | **25** | 人 AI 共用操作软件：实施过程协作透明化；本体弱 |
| 42  | [graphrag-engineering-pdfs](https://github.com/tvlnsiva/graphrag-engineering-pdfs) | 31 | 6 | 5 | 6 | 3 | 5 | **25** | 本地图 RAG 教学示例：快速上手参考 |
| 43  | [ontoskills](https://github.com/mareasw/ontoskills) | 20 | 8 | 4 | 5 | 3 | 4 | **24** | SKILL→RDF：技能本体化，规范 Agent 能力 |
| 44  | [ontology-driven-agent](https://github.com/yql210/ontology-driven-agent) | 17 | 7 | 4 | 6 | 3 | 4 | **24** | 最小教学示例：理解"本体驱动"概念快速入门 |
| 45  | [public-data-lens](https://github.com/hike-lab/public-data-lens) | 81 | 4 | 4 | 6 | 5 | 4 | **23** | MCP 数据集发现：边缘场景，与风险管控关联弱 |
| 46  | [ethereum-eips-ontology](https://github.com/prototypo/ethereum-eips-ontology) | 45 | 8 | 3 | 4 | 4 | 4 | **23** | 规范本体范例（领域不符）：作本体格式参考 |
| 47  | [objectstack](https://github.com/objectstack-ai/objectstack) | 38 | 5 | 5 | 5 | 4 | 4 | **23** | 应用框架：整体设计思路可参考；与本体弱相关 |
| 48  | [ad4m-core-deprecated](https://github.com/coasys/ad4m-core-deprecated) | 31 | 7 | 4 | 4 | 2 | 4 | **21** | 元本体思路开山作；已停更，仅作思想参考 |
| 49  | [sign-lang](https://github.com/sign-protocol/sign-lang) | 20 | 6 | 4 | 4 | 3 | 4 | **21** | 知识契约：Agent 协作责任界定思路 |
| 50  | [sz-semantics](https://github.com/senzing-garage/sz-semantics) | 20 | 5 | 3 | 5 | 3 | 3 | **19** | 格式转换小工具：边缘场景 |

---

## 三、分档解读与借鉴建议

### 第一梯队（11 个）

> 高适配：本体落地强 + 场景直接对口 + 可本地集成，建议**逐项深入调研**，是工具建设的核心参考。

| 项目 | Stars | 详细理由 | 借鉴点 |
|------|:---:|------|------|
| [context-ontology-accelerator](https://github.com/aws/context-ontology-accelerator) | 643 | 本体推理+SPARQL+MCP 四件套齐备，与方案 L1 规则引擎（可配置业务规则）+ L2 关系推演（本体推理）+ L4 LLM 辅助高度对应；AWS 官方背书，工程质量和文档有保障。扣分：AWS 云生态为主，本地轻量运行需裁剪；本体需按项目管控领域重新建模。 | 借鉴：规则+推理+SPARQL 的组合模式，可直接映射到工具的风险识别内核 |
| [ontopilot](https://github.com/deeplethe/ontopilot) | 437 | 本体落地度满分：文档→AI 起草→专家审核→版本发布→MCP 输出的全流水线，与方案"五类输入文档→本体"完全同构，可视为本体资产的生产工厂；MCP 输出便于 Nuxt 工具直接调用。扣分：社区规模小（437★）、面向本体工程师而非业务。 | 借鉴：文档→本体→审核→发布流水线，对应 M4 文档中心+自动识别 |
| [ontocast](https://github.com/growgraph/ontocast) | 228 | 边抽取事实边建本体，天然是"要素抽取 + 本体入库"的自动识别流水线核心组件（方案②③步）；Python 库可嵌入 Nitro server 直接复用；支持 LangGraph。扣分：项目年轻（228★）、文档待完善。 | 借鉴：抽取与建模一体化的实现，直接服务 M4 自动识别闭环 |
| [semantica](https://github.com/semantica-agi/semantica) | 10619 | 10619★ 最大社区，图存储+推理+可审计追溯，风险台账/决策留痕的强力底座；本地可部署、API 完善。扣分：是通用 Agent 上下文图而非 OWL 本体论项目，领域本体（合同/计划/风险）需自建。 | 借鉴：审计追溯（决策可查可审）与图存储模式 |
| [HugAgentOS](https://github.com/ZJU-REAL/HugAgentOS) | 682 | 方案 5.1 已明确引用：本体作为控制平面、违规操作被拦截纠正，就是"风险自动管控"的活教材；场景适配满分（Agent 越权拦截=合同越界/超范围操作拦截）。扣分：AgentOS 全量架构改造成本高，宜借鉴思路而非整体引入。 | 借鉴：本体约束拦截机制，对应 L2 关系推演+L3 信号检测 |
| [ontogpt](https://github.com/monarch-initiative/ontogpt) | 978 | LLM 按本体抽取结构化信息的能力是文档要素抽取（L4）最强开源组件，978★ + Monarch 机构背书；本体模板化抽取思路可直接迁移到合同条款、需求描述。扣分：生物医学领域绑定，需定制抽取模板。 | 借鉴：模板驱动的 LLM 抽取范式（extractor 模式） |
| [trustgraph](https://github.com/trustgraph-ai/trustgraph) | 2597 | 跨系统一致性验证能力直接对应"合同与进度对账""SLA 履约检测"——销售说签了、财务说没到款这类矛盾自动暴露，正是 L3 数据信号。扣分：超图模型非 OWL，与工具本体模型需桥接。 | 借鉴：多源一致性校验机制，用于全链路数据对账 |
| [jonex](https://github.com/jonexaiorg/jonex) | 684 | 多模态解析→本体化→LLM Wiki 的成品引擎，合同 PDF/表格/图片直接变可提问知识库，场景适配强（8分）；本地可跑。扣分：本体能力较轻，偏知识检索而非严格风险推理。 | 借鉴：多模态文档→知识的流水线，支撑五类输入知识化 |
| [automatic-KG-creation-with-LLM](https://github.com/fusion-jena/automatic-KG-creation-with-LLM) | 358 | LLM 全自动建本体+知识图谱，可快速生成"种子本体"（合同/需求/风险初始类结构）；耶拿大学出品、结构清晰。扣分：全自动质量需人工校验，适合起点不适合长期治理。 | 借鉴：自动本体构建管线，加速 M2 建模起步 |
| [OpenCrab](https://github.com/AlexAI-MCP/OpenCrab) | 102 | 9 语义空间+Neo4j 验证+MCP 插座：本体能力以 MCP 即插即用接入任何 Agent，本地集成得分高（8分）。扣分：102★ 社区小、概念超前落地验证少。 | 借鉴：MCP 语义空间模式，工具向外部 Agent 暴露本体能力 |
| [PRD-driven-context-engineering](https://github.com/mattgierhart/PRD-driven-context-engineering) | 184 | PRD→本体层→Agent 照图干活：需求/范围管控直接对应，需求蔓延、实现走样可被本体约束拦截；本地可跑。扣分：184★ 个人项目，工程化程度有限。 | 借鉴：PRD 结构化→本体约束路径，对应合同范围/需求确认风险 |

### 第二梯队（13 个）

> 中适配：单项能力突出（识别/集成/建模），建议**按需取用**，作为第一梯队的补充组件。

| 项目 | Stars | 详细理由 | 借鉴点 |
|------|:---:|------|------|
| [VeritasGraph](https://github.com/bibinprathap/VeritasGraph) | 313 | 答案自带证据链=风险溯源审计，任何风险结论可回溯到原始文档；本地可跑。扣分：本体为轻量图，需配合正式本体。 | 借鉴：证据链溯源设计，用于风险结论可审计 |
| [flexible-graphrag](https://github.com/stevereiner/flexible-graphrag) | 180 | 存储兼容性最强（15 图库+4 RDF+10 向量库+MCP+UI），本地集成得分全场最高（9分）：无论工具最终选哪种图存储都能接。扣分：本体能力弱，需外部本体。 | 借鉴：存储抽象层+本地一键跑，避免图库绑定 |
| [Symbio](https://github.com/854875058/Symbio) | 264 | 神经符号安全约束=Agent 行为风险管控，国产项目、理念完整（动态 DAG+本体化记忆）。扣分：社区规模中等，改造成本需评估。 | 借鉴：行为安全约束层设计 |
| [OntoLearner](https://github.com/sciknoworg/OntoLearner) | 82 | 本体学习工具箱：150+ 本体源、4 类任务统一接口，可作本体构建管线的基础设施。扣分：偏研究框架，非直接产品。 | 借鉴：统一的本体学习接口，接入自动识别 |
| [dana](https://github.com/aitomatic/dana) | 59 | 边干活边建/改本体=风险规则自动演进（业务变了规矩自己更新），正好解决"本体是静态的"痛点。扣分：dana 语言栈独特，集成成本高。 | 借鉴：本体动态演进理念 |
| [memonto](https://github.com/shihanwan/memonto) | 100 | Agent 记忆按本体归档且可自动扩展本体，风险台账/经验沉淀建模参考；Python 可嵌入。扣分：100★ 年轻项目。 | 借鉴：记忆本体化+本体自动扩展 |
| [OntoGenix](https://github.com/tecnomod-um/OntoGenix) | 39 | CSV/Excel→OWL 本体+映射规则：正好匹配方案 M3 数据导入（Excel/CSV）→本体的路径，业务数据直接本体化。扣分：39★ 社区小。 | 借鉴：表格数据→本体映射规则生成 |
| [ontosphere](https://github.com/boricles/ontosphere) | 39 | 可视化本体建模画板（PDF→本体→拖拽编辑→版本对比）：本体建模工作台（M2）的现成交互参考。扣分：功能深度有限。 | 借鉴：可视化建模交互范式 |
| [SEPA](https://github.com/vaimee/SEPA) | 33 | 语义事件总线：风险事件跨模块传导（合同风险→需求→方案→进度）的发布订阅机制，对应 L2 联动升级；SPARQL 订阅思路先进。扣分：Java 栈与 Nuxt 集成需桥接。 | 借鉴：事件总线驱动风险联动 |
| [ontoloom](https://github.com/ExtensityAI/ontoloom) | 21 | 最纯粹的 OWL MCP：Agent 直接建/查 OWL 2 本体=本体建模 API 化，工具的"本体能力 MCP 化"可直接复用。扣分：21★ 早期项目。 | 借鉴：OWL 操作的 MCP 封装模式 |
| [LLMs4OL](https://github.com/HamedBabaei/LLMs4OL) | 183 | 本体学习三任务基准：选型 LLM 识别能力时当"考卷"，用数据说话。扣分：基准非产品，不能直接集成。 | 借鉴：LLM 本体学习能力评测方法 |
| [OntoFlow](https://github.com/ThutmoseAI/OntoFlow) | 77 | 本体驱动+实时数据流图计算：L3 数据信号检测（进度偏差、SLA 违约等阈值预警）的思路来源。扣分：77★ 年轻、文档少。 | 借鉴：实时信号检测架构 |
| [sofagent](https://github.com/KongFangXun/sofagent) | 39 | 规则审计+快照回滚：企业 AI 安全带，理念最贴近风险管控（24 条规则审计），可映射到工具的风险规则引擎。扣分：本体弱（4分），需外部本体支撑。 | 借鉴：规则审计+回滚机制 |

### 第三梯队（20 个）

> 弱适配：仅在某个细节上有借鉴价值（交互/机制/教学），不直接引入。

| 项目 | Stars | 详细理由 | 借鉴点 |
|------|:---:|------|------|
| [OntoEKG](https://github.com/LiberAI/OntoEKG) | 56 | 按企业数据定制专属本体：领域本体生成思路可用；56★ 社区小。 | 借鉴：企业数据→定制本体 |
| [LLMs4OM](https://github.com/HamedBabaei/LLMs4OM) | 47 | 本体匹配：合并两套本体（如并购双方术语）时有用；核心场景关联弱。 | 借鉴：本体对齐自动化 |
| [OntoChat](https://github.com/King-s-Knowledge-Graph-Lab/OntoChat) | 30 | 聊天建本体：让不懂本体的业务专家参与建模，降低门槛，可参考其交互。 | 借鉴：人机协作建模交互 |
| [MemGraphRAG](https://github.com/XMUDeepLIT/MemGraphRAG) | 203 | KDD 论文级多 Agent 共享记忆图谱：风险知识跨项目积累思路。 | 借鉴：集体记忆图谱 |
| [ontology-mcp-self-healing](https://github.com/cloudbadal007/ontology-mcp-self-healing) | 19 | 库表变化→本体自适应：业务表结构一改 Agent 自动适应，可作规则自动更新参考。 | 借鉴：本体自愈更新机制 |
| [vault-ld](https://github.com/The-Knowledge-Graph-Guys/vault-ld) | 225 | 笔记→RDF：文档语义化思路可借鉴；与项目管控场景距离较远。 | 借鉴：文档→RDF 轻量转换 |
| [metronix-memory](https://github.com/mtrnix/metronix-memory) | 71 | 自托管 MCP 记忆服务：本地集成容易（8分）；与本体/风险弱相关。 | 借鉴：自托管 MCP 服务形态 |
| [brick-llm](https://github.com/EURAC-EEBgroup/brick-llm) | 28 | 成熟领域本体（BRICK）+Agent 示范：标准本体+Agent 的完整范例，本体资产组织方式可参考。 | 借鉴：领域本体+Agent 集成范式 |
| [persistent-mind-model-v1.0](https://github.com/scottonanski/persistent-mind-model-v1.0) | 45 | 事件化可审计：AI 承诺/记忆全部留痕可回放，操作留痕思路可用于风险审计。 | 借鉴：事件化留痕 |
| [ontoindex](https://github.com/ontograph/ontoindex) | 39 | 代码→本体+句子索引 MCP：技术方案文档/代码库分析辅助。 | 借鉴：代码语义索引 |
| [ummon](https://github.com/Nayshins/ummon) | 38 | 代码语义层（Rust）：技术方案与代码库关系理解辅助。 | 借鉴：代码库语义化 |
| [khive](https://github.com/ohdearquant/khive) | 33 | Agent 自建/查/扩知识图谱：风险知识积累与复用的轻量方案。 | 借鉴：Agent 知识图谱 CRUD |
| [ontology-llm](https://github.com/qzc438/ontology-llm) | 23 | Agent 谈判匹配本体：自动化本体对齐的研究思路。 | 借鉴：多 Agent 协作对齐 |
| [tardygrada](https://github.com/fabio-rovai/tardygrada) | 20 | 8 层论断验证：AI 输出可信度校验（C 语言、20★），可作 L4 LLM 结果把关的思路。 | 借鉴：多层验证把关 |
| [LLMs4OntologyDev-ESWC2024](https://github.com/LiUSemWeb/LLMs4OntologyDev-ESWC2024) | 19 | ESWC 顶会教程代码：团队学习"LLM 开发本体"的现成教材。 | 借鉴：团队培训材料 |
| [software-periodic-table](https://github.com/NullLabTests/software-periodic-table) | 80 | 软件零件库：技术方案组件化、成熟度检测可借鉴（新技术识别→技术风险）。 | 借鉴：技术栈成熟度信号 |
| [sixb](https://github.com/sixb-ai/sixb) | 45 | 人 AI 共用操作软件：实施过程协作透明化（进度/变更同步可见）。 | 借鉴：人机协作透明化 |
| [graphrag-engineering-pdfs](https://github.com/tvlnsiva/graphrag-engineering-pdfs) | 31 | 本地图 RAG 教学示例：快速上手"本体+图 RAG"的入门路径。 | 借鉴：快速原型参考 |
| [ontoskills](https://github.com/mareasw/ontoskills) | 20 | SKILL→RDF：Agent 技能本体化，规范 Agent 能力边界（可参考定义"允许做的事"）。 | 借鉴：能力边界本体化 |
| [ontology-driven-agent](https://github.com/yql210/ontology-driven-agent) | 17 | 最小教学示例：理解"本体驱动 Agent"概念的快速入门 Demo。 | 借鉴：概念演示 |

### 第四梯队（6 个）

> 不推荐：场景偏离或已停更，仅作思想参考。

| 项目 | Stars | 详细理由 | 借鉴点 |
|------|:---:|------|------|
| [public-data-lens](https://github.com/hike-lab/public-data-lens) | 81 | MCP 数据集发现：边缘场景，与风险管控关联弱。 | 借鉴：无（可忽略） |
| [ethereum-eips-ontology](https://github.com/prototypo/ethereum-eips-ontology) | 45 | 规范本体范例：领域不符，仅作本体格式/组织参考。 | 借鉴：本体文件组织方式 |
| [objectstack](https://github.com/objectstack-ai/objectstack) | 38 | 应用框架：整体设计思路可参考，与本体弱相关。 | 借鉴：无（可忽略） |
| [ad4m-core-deprecated](https://github.com/coasys/ad4m-core-deprecated) | 31 | 元本体思路开山作：已停更，仅作思想参考。 | 借鉴：元本体思想 |
| [sign-lang](https://github.com/sign-protocol/sign-lang) | 20 | 知识契约：Agent 协作责任界定思路。 | 借鉴：无（可忽略） |
| [sz-semantics](https://github.com/senzing-garage/sz-semantics) | 20 | 格式转换小工具：边缘场景，得分垫底。 | 借鉴：无（可忽略） |

---

## 四、结论：选型建议（对应方案里程碑）

| 方案模块 | 建议参考的开源项目 | 用途 |
|---------|------------------|------|
| M2 本体建模工作台 | ontosphere（交互）、ontopilot（流水线）、ontoloom（OWL MCP） | 可视化建模 + 文档→本体 + 本体 API 化 |
| M3 业务数据管理 | OntoGenix（Excel→本体）、jonex（文档知识化） | 数据导入即本体化 |
| M4 自动识别流水线 | ontocast（抽取+建本体）、ontogpt（LLM 抽取范式）、aws-accelerator（规则+推理）、sofagent（规则审计）、VeritasGraph（证据链） | L1 规则 / L2 推演 / L4 抽取 + 审计溯源 |
| M5 关系图谱/仪表盘 | semantica（图存储+追溯）、flexible-graphrag（存储抽象）、trustgraph（一致性对账） | 风险传导可视化 + 跨系统信号 |
| 架构理念 | HugAgentOS（本体控制平面）、SEPA（事件总线）、dana（本体动态演进）、self-healing（规则自愈） | 本体约束 + 风险联动 + 规则进化 |

> **落地提醒**：本体驱动的核心仍是**自研领域本体**（合同/计划/进度/需求/方案/风险/运维，方案已定义 15 类 16 关系），开源项目提供的是**抽取、推理、存储、校验、审计**能力组件——先跑通 M1 骨架，再按里程碑逐步引入。
