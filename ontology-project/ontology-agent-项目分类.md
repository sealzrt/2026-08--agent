# 本体论 + Agent 开源项目 Top 50 分类分析（多标签版）

> 更新时间：2026-08-24
> 数据来源：[github-ontology-agent-top20.md](./github-ontology-agent-top20.md) 中 Top 50 项目
> 分类方式：**一个项目可属于多个分类**（多标签），每类内部按 **相关性（🟢高 > 🟡中 > ⚪低）+ Stars** 排序

---

## 多标签说明

- 50 个项目中，**48 个属于多个分类**（平均每个项目 2.5 个标签），仅 2 个单标签
- 相关性由项目核心定位决定：**高** = 该分类是项目的主战场；**中** = 重要组成部分；**低** = 边缘关联
- 同一项目会出现在多个分类表格中，排序位置随相关性变化

| 分类 | 项目数(含重复) | 一句话定位 |
|------|:---:|------|
| A. 图/语义基础设施 | 9 | 打地基的：图+语义底层能力 |
| B. 本体工程与治理工具 | 15 | 本体工厂流水线：AI 起草 + 人审核 |
| C. 本体学习/抽取/匹配 | 20 | 本体自动生成器：AI 学/抽/对齐本体 |
| D. 本体驱动 Agent | 20 | 给 Agent 装规矩芯片：本体做控制平面 |
| E. 知识图谱 / GraphRAG | 24 | 本体仓库+查档员：图存储与关系检索 |
| F. 多 Agent 协同框架 | 11 | 多 Agent 组队：分工协作通信 |
| G. MCP 本体/工具服务 | 14 | 本体插座：MCP 即插即用 |
| H. 知识引擎/领域应用 | 10 | 装好即用的整机产品 |

## A. 图/语义基础设施（9 个）

> 打地基的：给上层项目提供"图+语义"底层能力；解决系统各说各话、决策不可追溯

| 相关性 | Stars | 项目 | 大白话（示例） | 解决什么业务问题 |
|:---:|:---:|------|------|------|
| 🟢 高 | 10619 | [semantica](https://github.com/semantica-agi/semantica) | AI 的"记忆宫殿"：所有上下文建成可查询的关系图，决策可查可审<br>**例：**老板问"上次为什么选 A 方案"，Agent 能翻出当时的推理链条，而不是说"我忘了" | AI 决策像黑箱，出错没人能解释、追责，业务部门不敢用 |
| 🟢 高 | 2597 | [trustgraph](https://github.com/trustgraph-ai/trustgraph) | 给多个 AI 系统装"翻译官"：超图统一语义，行为可验证<br>**例：**销售 Agent 说"客户已签约"，财务系统显示没到款——超图自动发现两边说法对不上 | 多个 AI 系统数据各说各话、互相矛盾，出错时没人发现 |
| 🟢 高 | 643 | [context-ontology-accelerator](https://github.com/aws/context-ontology-accelerator) | AWS 官方"懂规矩的上下文管家"：本体推理 + SPARQL + MCP<br>**例：**给 Agent 配好"报销规则本体"，它就知道哪些发票能报、哪些不能 | Agent 不懂公司规矩，每次干活都要重新教一遍 |
| 🟢 高 | 184 | [PRD-driven-context-engineering](https://github.com/mattgierhart/PRD-driven-context-engineering) | 把 PRD 变成 Agent 的"施工图纸"：需求→本体层→Agent 照图干活<br>**例：**PRD 里写"支持微信登录"，自动转成本体约束，开发 Agent 照做 | 需求文档和开发 Agent 脱节，实现出来走样 |
| 🟢 高 | 20 | [sign-lang](https://github.com/sign-protocol/sign-lang) | Agent 企业的"合同语言"：图记号定义知识契约<br>**例：**用图记号定义"数据所有权"契约，Agent 之间按契约协作 | Agent 协作没有业务契约，越权、扯皮难界定 |
| 🟡 中 | 682 | [HugAgentOS](https://github.com/ZJU-REAL/HugAgentOS) | 浙大企业级 AgentOS：本体做"交通法规"，违规操作被拦截纠正<br>**例：**Agent 想越权查工资数据，本体规则当场拦截并纠正它 | Agent 乱操作没人管，企业不敢放权给它干活 |
| 🟡 中 | 77 | [OntoFlow](https://github.com/ThutmoseAI/OntoFlow) | "会演化的数字孪生"：本体驱动 + 实时数据流图计算<br>**例：**工厂设备数据实时流入本体图，异常自动触发处置流程 | 数字孪生和实时业务数据脱节，模型是死的 |
| 🟡 中 | 33 | [SEPA](https://github.com/vaimee/SEPA) | Agent 之间的"微信群"：语义事件总线，SPARQL 订阅<br>**例：**库存 Agent 发"缺货"事件，采购 Agent 自动订阅响应 | 系统间事件传递靠硬编码，加个系统就要改代码 |
| 🟡 中 | 31 | [ad4m-core-deprecated](https://github.com/coasys/ad4m-core-deprecated) | 元本体思路开山作：Agent 间"共同语言"（已停更）<br>**例：**两个异构系统通过共同元本体互相理解（思路参考） | 异构系统"语言不通"，集成靠定制开发（已停更，作思路参考） |

## B. 本体工程与治理工具（15 个）

> 本体"工厂流水线"：文档→AI 起草→专家审核→版本发布；解决手工建本体慢贵、没人管

| 相关性 | Stars | 项目 | 大白话（示例） | 解决什么业务问题 |
|:---:|:---:|------|------|------|
| 🟢 高 | 437 | [ontopilot](https://github.com/deeplethe/ontopilot) | 本体界的"GitHub+工厂"：文档→本体→审核→发布→MCP 输出<br>**例：**把公司制度文档丢进去，AI 起草出"报销流程本体"，专家审核后自动发布 | 手工建本体要请专家，又慢又贵，建完还没人维护 |
| 🟢 高 | 225 | [vault-ld](https://github.com/The-Knowledge-Graph-Guys/vault-ld) | 让 Obsidian 笔记自动变"联网数据"：YAML-LD → RDF<br>**例：**笔记里写"张三-任职-某公司"，自动变成标准链接数据 | 个人/团队笔记是孤岛，无法和其他系统共享 |
| 🟢 高 | 102 | [OpenCrab](https://github.com/AlexAI-MCP/OpenCrab) | "世界本体操作系统"：9 语义空间 + Neo4j 验证 + MCP 插座<br>**例：**用 MCP 连上"餐饮本体空间"，Agent 自动懂菜品分类和配料规则 | 本体建好了但没有标准接口，Agent 用不上 |
| 🟢 高 | 45 | [ethereum-eips-ontology](https://github.com/prototypo/ethereum-eips-ontology) | 区块链"新华字典"：以太坊术语整理成的规范本体<br>**例：**查"EIP-1559 是什么"，给出准确定义和关联提案 | 区块链术语混乱，查资料靠零散文档 |
| 🟢 高 | 39 | [OntoGenix](https://github.com/tecnomod-um/OntoGenix) | 上传 CSV → AI 自动生成 OWL 本体 + 数据映射规则<br>**例：**上传客户 Excel 表，自动生成"客户本体"和字段映射规则 | Excel 表没有语义，数据堆在那里用不起来 |
| 🟢 高 | 39 | [ontosphere](https://github.com/boricles/ontosphere) | 可视化"本体画板"：PDF→本体→拖拽编辑→版本对比<br>**例：**把 50 页 PDF 规范变成可视化本体图，拖拽就能改 | 本体看不见摸不着，业务人员没法参与评审 |
| 🟢 高 | 30 | [OntoChat](https://github.com/King-s-Knowledge-Graph-Lab/OntoChat) | 用聊天方式建本体：你提需求，AI 帮你整理成规范本体<br>**例：**跟 AI 聊"我们系统的用户有三种"，它帮你整理成规范本体 | 业务专家不懂本体格式，参与不进来 |
| 🟡 中 | 978 | [ontogpt](https://github.com/monarch-initiative/ontogpt) | 生物医学界权威：LLM 按医学本体从论文里抽结构化信息<br>**例：**丢 1000 篇医学论文进去，自动抽出"哪种药治哪种病"的关系清单 | 专家看文献太慢，论文里藏的知识挖不出来、没法批量用 |
| 🟡 中 | 184 | [PRD-driven-context-engineering](https://github.com/mattgierhart/PRD-driven-context-engineering) | 把 PRD 变成 Agent 的"施工图纸"：需求→本体层→Agent 照图干活<br>**例：**PRD 里写"支持微信登录"，自动转成本体约束，开发 Agent 照做 | 需求文档和开发 Agent 脱节，实现出来走样 |
| 🟡 中 | 82 | [OntoLearner](https://github.com/sciknoworg/OntoLearner) | 本体学习工具箱：150+ 本体源 + 4 类任务 + 统一接口<br>**例：**给 20 篇领域文档，一键生成候选术语和分类关系 | 本体学习工具碎片化，想入门不知道从哪下手 |
| 🟡 中 | 80 | [software-periodic-table](https://github.com/NullLabTests/software-periodic-table) | 软件的"元素周期表"：115 个零件，编码 Agent 搭积木<br>**例：**要做"表单提交"功能，Agent 从 115 个零件里挑合适的拼装 | Agent 写代码质量不可控，组件没法复用 |
| 🟡 中 | 59 | [dana](https://github.com/aitomatic/dana) | 神经符号 Agent 语言：AI 边干活边自动建/改本体<br>**例：**Agent 干活的每一步自动"立规矩"，业务变了规则自己更新 | 本体是静态的，业务一变规矩就过时 |
| 🟡 中 | 21 | [ontoloom](https://github.com/ExtensityAI/ontoloom) | 最纯粹的"本体 MCP 插座"：让 Agent 直接建/查 OWL 2 本体<br>**例：**用 MCP 直接让 Agent 建一个"设备-位置"本体并查询 | 本体工具和 Agent 之间没有桥，建了没人用 |
| 🟡 中 | 20 | [ontoskills](https://github.com/mareasw/ontoskills) | 把 Agent 技能（SKILL.md）编译成规范本体 RDF/Turtle<br>**例：**把公司内部 SKILL.md 技能说明编译成本体，全公司 Agent 共享 | Agent 技能散落各处，没法统一管理和复用 |
| 🟡 中 | 19 | [LLMs4OntologyDev-ESWC2024](https://github.com/LiUSemWeb/LLMs4OntologyDev-ESWC2024) | ESWC 顶会"LLM 开发本体"教程代码（教学材料）<br>**例：**跟着顶会教程代码，学"怎么用 LLM 建本体" | 想学 LLM+本体，没有权威可跑的教学材料 |

## C. 本体学习/抽取/匹配（20 个）

> 本体"自动生成器"：AI 从资料里学/抽/对齐本体；解决人工建本体太慢、本体合并

| 相关性 | Stars | 项目 | 大白话（示例） | 解决什么业务问题 |
|:---:|:---:|------|------|------|
| 🟢 高 | 978 | [ontogpt](https://github.com/monarch-initiative/ontogpt) | 生物医学界权威：LLM 按医学本体从论文里抽结构化信息<br>**例：**丢 1000 篇医学论文进去，自动抽出"哪种药治哪种病"的关系清单 | 专家看文献太慢，论文里藏的知识挖不出来、没法批量用 |
| 🟢 高 | 358 | [automatic-KG-creation-with-LLM](https://github.com/fusion-jena/automatic-KG-creation-with-LLM) | 耶拿大学"一条龙自动建图机"：LLM 全自动建本体+知识图谱<br>**例：**喂 500 篇行业报告，全自动产出"行业关系图谱" | 建知识图谱要人工标注，成本高、周期长、不可复制 |
| 🟢 高 | 228 | [ontocast](https://github.com/growgraph/ontocast) | "边干活边立规矩"：抽事实和建本体同步进行，可嵌入 LangGraph<br>**例：**边读文档边抽"人物-公司-事件"事实，顺手把本体也建起来了 | 先建本体再抽数据，两步脱节、反复返工 |
| 🟢 高 | 183 | [LLMs4OL](https://github.com/HamedBabaei/LLMs4OL) | 给 LLM 出的"本体学习考卷"：术语类型/分类/关系三任务基准<br>**例：**拿它当考卷测一测，你的 LLM 能从百科里学到多少本体知识 | 不知道哪个模型"学本体"能力强，选型没依据 |
| 🟢 高 | 82 | [OntoLearner](https://github.com/sciknoworg/OntoLearner) | 本体学习工具箱：150+ 本体源 + 4 类任务 + 统一接口<br>**例：**给 20 篇领域文档，一键生成候选术语和分类关系 | 本体学习工具碎片化，想入门不知道从哪下手 |
| 🟢 高 | 56 | [OntoEKG](https://github.com/LiberAI/OntoEKG) | LLM 按企业数据定制专属本体，用于企业知识图谱<br>**例：**按公司"客户-订单-产品"数据，自动定制企业专属本体 | 通用本体不合身，企业图谱建不起来 |
| 🟢 高 | 47 | [LLMs4OM](https://github.com/HamedBabaei/LLMs4OM) | 两个本体怎么配对？RAG 检索 + LLM 判断找"同名兄弟"<br>**例：**A 公司的"客户"和 B 公司的"客户"其实是同一概念，自动配对 | 并购、合作时两套术语体系对不上，打通靠人工 |
| 🟢 高 | 39 | [OntoGenix](https://github.com/tecnomod-um/OntoGenix) | 上传 CSV → AI 自动生成 OWL 本体 + 数据映射规则<br>**例：**上传客户 Excel 表，自动生成"客户本体"和字段映射规则 | Excel 表没有语义，数据堆在那里用不起来 |
| 🟢 高 | 23 | [ontology-llm](https://github.com/qzc438/ontology-llm) | Agent-OM：派 AI Agent 去"谈判"完成本体配对<br>**例：**派 3 个 Agent 分别考察两个本体，谈判完成配对 | 本体匹配靠人工，量大了根本做不完 |
| 🟢 高 | 19 | [LLMs4OntologyDev-ESWC2024](https://github.com/LiUSemWeb/LLMs4OntologyDev-ESWC2024) | ESWC 顶会"LLM 开发本体"教程代码（教学材料）<br>**例：**跟着顶会教程代码，学"怎么用 LLM 建本体" | 想学 LLM+本体，没有权威可跑的教学材料 |
| 🟡 中 | 684 | [jonex](https://github.com/jonexaiorg/jonex) | 万能文件变知识的成品引擎：多模态解析 → 本体化 → LLM Wiki<br>**例：**把 100 份 PDF 合同、表格、图片扔进去，变成能提问的"公司知识库" | 企业文件多而杂，找资料靠人肉翻，新人上手慢 |
| 🟡 中 | 437 | [ontopilot](https://github.com/deeplethe/ontopilot) | 本体界的"GitHub+工厂"：文档→本体→审核→发布→MCP 输出<br>**例：**把公司制度文档丢进去，AI 起草出"报销流程本体"，专家审核后自动发布 | 手工建本体要请专家，又慢又贵，建完还没人维护 |
| 🟡 中 | 313 | [VeritasGraph](https://github.com/bibinprathap/VeritasGraph) | "讲证据的"GraphRAG：沿关系链推理，答案可溯源<br>**例：**问"哪些客户和已违约客户有关系？"，答案自带证据链 | 普通 RAG 答复杂关系问题会编造，结论没法信 |
| 🟡 中 | 180 | [flexible-graphrag](https://github.com/stevereiner/flexible-graphrag) | "存储兼容王"：15 图库+4 RDF+10 向量库，带 UI/MCP<br>**例：**想用 Neo4j 就用 Neo4j，想换 Memgraph 改一行配置 | 图 RAG 绑定单一存储，换库就得重写 |
| 🟡 中 | 100 | [memonto](https://github.com/shihanwan/memonto) | 给 Agent 记忆装"档案格式"：按本体存，可自动扩展本体<br>**例：**Agent 记住"客户 A 偏好低价"，按本体归档，下次直接调用 | Agent 记忆一团浆糊，跨会话就忘、还不准 |
| 🟡 中 | 59 | [dana](https://github.com/aitomatic/dana) | 神经符号 Agent 语言：AI 边干活边自动建/改本体<br>**例：**Agent 干活的每一步自动"立规矩"，业务变了规则自己更新 | 本体是静态的，业务一变规矩就过时 |
| 🟡 中 | 39 | [ontosphere](https://github.com/boricles/ontosphere) | 可视化"本体画板"：PDF→本体→拖拽编辑→版本对比<br>**例：**把 50 页 PDF 规范变成可视化本体图，拖拽就能改 | 本体看不见摸不着，业务人员没法参与评审 |
| 🟡 中 | 31 | [graphrag-engineering-pdfs](https://github.com/tvlnsiva/graphrag-engineering-pdfs) | 教学示例：本地 LLM + 本体 + 图 RAG 处理工程 PDF<br>**例：**照着教程，本地跑通"工程图纸 PDF → 知识图谱 → 问答" | 想学本地图 RAG，没有开箱即用的入门示例 |
| 🟡 中 | 30 | [OntoChat](https://github.com/King-s-Knowledge-Graph-Lab/OntoChat) | 用聊天方式建本体：你提需求，AI 帮你整理成规范本体<br>**例：**跟 AI 聊"我们系统的用户有三种"，它帮你整理成规范本体 | 业务专家不懂本体格式，参与不进来 |
| ⚪ 低 | 20 | [sz-semantics](https://github.com/senzing-garage/sz-semantics) | 小工具：实体消歧 JSON → 图/语义格式转换<br>**例：**把清洗好的实体数据转成图格式，供下游使用 | 数据格式转换琐碎重复（边缘小工具） |

## D. 本体驱动 Agent（20 个）

> 给 Agent 装"规矩芯片"：本体作为控制平面约束记忆/推理/行动；解决 Agent 胡说八道、不可追溯

| 相关性 | Stars | 项目 | 大白话（示例） | 解决什么业务问题 |
|:---:|:---:|------|------|------|
| 🟢 高 | 682 | [HugAgentOS](https://github.com/ZJU-REAL/HugAgentOS) | 浙大企业级 AgentOS：本体做"交通法规"，违规操作被拦截纠正<br>**例：**Agent 想越权查工资数据，本体规则当场拦截并纠正它 | Agent 乱操作没人管，企业不敢放权给它干活 |
| 🟢 高 | 100 | [memonto](https://github.com/shihanwan/memonto) | 给 Agent 记忆装"档案格式"：按本体存，可自动扩展本体<br>**例：**Agent 记住"客户 A 偏好低价"，按本体归档，下次直接调用 | Agent 记忆一团浆糊，跨会话就忘、还不准 |
| 🟢 高 | 59 | [dana](https://github.com/aitomatic/dana) | 神经符号 Agent 语言：AI 边干活边自动建/改本体<br>**例：**Agent 干活的每一步自动"立规矩"，业务变了规则自己更新 | 本体是静态的，业务一变规矩就过时 |
| 🟢 高 | 45 | [persistent-mind-model-v1.0](https://github.com/scottonanski/persistent-mind-model-v1.0) | 给 AI 可回放的人格：记忆/反思/承诺全部事件化可审计<br>**例：**AI 承诺"明天跟进客户"，这个承诺被记录、可回放、可检查 | AI 说过的话不认账，出了问题无法审计 |
| 🟢 高 | 33 | [khive](https://github.com/ohdearquant/khive) | 专门给 Agent 用的知识图谱：Agent 自己建/查/扩（Rust）<br>**例：**Agent 边干活边把学到的知识写进图谱，下次直接查 | Agent 的知识零散在对话里，无法积累复用 |
| 🟢 高 | 31 | [ad4m-core-deprecated](https://github.com/coasys/ad4m-core-deprecated) | 元本体思路开山作：Agent 间"共同语言"（已停更）<br>**例：**两个异构系统通过共同元本体互相理解（思路参考） | 异构系统"语言不通"，集成靠定制开发（已停更，作思路参考） |
| 🟢 高 | 23 | [ontology-llm](https://github.com/qzc438/ontology-llm) | Agent-OM：派 AI Agent 去"谈判"完成本体配对<br>**例：**派 3 个 Agent 分别考察两个本体，谈判完成配对 | 本体匹配靠人工，量大了根本做不完 |
| 🟢 高 | 20 | [ontoskills](https://github.com/mareasw/ontoskills) | 把 Agent 技能（SKILL.md）编译成规范本体 RDF/Turtle<br>**例：**把公司内部 SKILL.md 技能说明编译成本体，全公司 Agent 共享 | Agent 技能散落各处，没法统一管理和复用 |
| 🟢 高 | 19 | [ontology-mcp-self-healing](https://github.com/cloudbadal007/ontology-mcp-self-healing) | "自愈型"多 Agent：库表变了，本体+MCP 让 Agent 自动适应<br>**例：**数据库加了新表，Agent 自动更新本体、继续干活 | 业务表结构一改，Agent 就"失灵"，维护成本高 |
| 🟢 高 | 17 | [ontology-driven-agent](https://github.com/yql210/ontology-driven-agent) | 最小教学示例：一个按本体规矩干活的 Agent 长什么样<br>**例：**最小 Demo：让 Agent 只做本体允许的事 | 不知道"本体驱动 Agent"长什么样，先看个 Demo |
| 🟡 中 | 10619 | [semantica](https://github.com/semantica-agi/semantica) | AI 的"记忆宫殿"：所有上下文建成可查询的关系图，决策可查可审<br>**例：**老板问"上次为什么选 A 方案"，Agent 能翻出当时的推理链条，而不是说"我忘了" | AI 决策像黑箱，出错没人能解释、追责，业务部门不敢用 |
| 🟡 中 | 264 | [Symbio](https://github.com/854875058/Symbio) | 国产多 Agent 全家桶：动态 DAG + 本体化记忆 + 神经符号安全<br>**例：**市场 Agent 和客服 Agent 协作处理客户投诉，全程用统一记忆和规则 | 多个 Agent 协作时各自为政，记忆和规则对不上 |
| 🟡 中 | 228 | [ontocast](https://github.com/growgraph/ontocast) | "边干活边立规矩"：抽事实和建本体同步进行，可嵌入 LangGraph<br>**例：**边读文档边抽"人物-公司-事件"事实，顺手把本体也建起来了 | 先建本体再抽数据，两步脱节、反复返工 |
| 🟡 中 | 203 | [MemGraphRAG](https://github.com/XMUDeepLIT/MemGraphRAG) | [KDD 2026] 有记忆的多 Agent 图检索，团队越干越聪明<br>**例：**多个 Agent 共用一个记忆图谱，A 发现的规律 B 直接能用 | Agent 团队没有集体记忆，每次都在重新摸索 |
| 🟡 中 | 102 | [OpenCrab](https://github.com/AlexAI-MCP/OpenCrab) | "世界本体操作系统"：9 语义空间 + Neo4j 验证 + MCP 插座<br>**例：**用 MCP 连上"餐饮本体空间"，Agent 自动懂菜品分类和配料规则 | 本体建好了但没有标准接口，Agent 用不上 |
| 🟡 中 | 80 | [software-periodic-table](https://github.com/NullLabTests/software-periodic-table) | 软件的"元素周期表"：115 个零件，编码 Agent 搭积木<br>**例：**要做"表单提交"功能，Agent 从 115 个零件里挑合适的拼装 | Agent 写代码质量不可控，组件没法复用 |
| 🟡 中 | 71 | [metronix-memory](https://github.com/mtrnix/metronix-memory) | 自托管 Agent"记忆 U 盘"：MCP 原生、支持本地模型<br>**例：**本地部署一个记忆服务，Agent 重启后还记得上次聊到哪 | Agent 没有长期记忆，每次对话从零开始 |
| 🟡 中 | 39 | [sofagent](https://github.com/KongFangXun/sofagent) | 企业 AI 的"安全带"：24 条规则审计 + 快照回滚<br>**例：**Agent 删库前被规则拦下，操作记录还能回滚 | AI 操作失误会造成事故，没有保险丝 |
| 🟡 中 | 28 | [brick-llm](https://github.com/EURAC-EEBgroup/brick-llm) | 建筑界"标准本体+Agent"示范：BRICK 本体 + LangGraph<br>**例：**问"三楼会议室空调坏了找谁"，Agent 按建筑本体给出答案 | 建筑运维知识没人整理，排障全靠老师傅 |
| 🟡 中 | 20 | [tardygrada](https://github.com/fabio-rovai/tardygrada) | AI 的"安检通道"：每个论断过 8 层验证才放行（C 语言）<br>**例：**Agent 输出"客户流失率 30%"，先过 8 层验证再给你 | AI 输出不可信，关键决策不敢用 |

## E. 知识图谱 / GraphRAG（24 个）

> 本体"仓库+查档员"：本体进图存储，AI 沿关系链查证；解决复杂关系问题答不好

| 相关性 | Stars | 项目 | 大白话（示例） | 解决什么业务问题 |
|:---:|:---:|------|------|------|
| 🟢 高 | 643 | [context-ontology-accelerator](https://github.com/aws/context-ontology-accelerator) | AWS 官方"懂规矩的上下文管家"：本体推理 + SPARQL + MCP<br>**例：**给 Agent 配好"报销规则本体"，它就知道哪些发票能报、哪些不能 | Agent 不懂公司规矩，每次干活都要重新教一遍 |
| 🟢 高 | 358 | [automatic-KG-creation-with-LLM](https://github.com/fusion-jena/automatic-KG-creation-with-LLM) | 耶拿大学"一条龙自动建图机"：LLM 全自动建本体+知识图谱<br>**例：**喂 500 篇行业报告，全自动产出"行业关系图谱" | 建知识图谱要人工标注，成本高、周期长、不可复制 |
| 🟢 高 | 313 | [VeritasGraph](https://github.com/bibinprathap/VeritasGraph) | "讲证据的"GraphRAG：沿关系链推理，答案可溯源<br>**例：**问"哪些客户和已违约客户有关系？"，答案自带证据链 | 普通 RAG 答复杂关系问题会编造，结论没法信 |
| 🟢 高 | 228 | [ontocast](https://github.com/growgraph/ontocast) | "边干活边立规矩"：抽事实和建本体同步进行，可嵌入 LangGraph<br>**例：**边读文档边抽"人物-公司-事件"事实，顺手把本体也建起来了 | 先建本体再抽数据，两步脱节、反复返工 |
| 🟢 高 | 203 | [MemGraphRAG](https://github.com/XMUDeepLIT/MemGraphRAG) | [KDD 2026] 有记忆的多 Agent 图检索，团队越干越聪明<br>**例：**多个 Agent 共用一个记忆图谱，A 发现的规律 B 直接能用 | Agent 团队没有集体记忆，每次都在重新摸索 |
| 🟢 高 | 180 | [flexible-graphrag](https://github.com/stevereiner/flexible-graphrag) | "存储兼容王"：15 图库+4 RDF+10 向量库，带 UI/MCP<br>**例：**想用 Neo4j 就用 Neo4j，想换 Memgraph 改一行配置 | 图 RAG 绑定单一存储，换库就得重写 |
| 🟢 高 | 77 | [OntoFlow](https://github.com/ThutmoseAI/OntoFlow) | "会演化的数字孪生"：本体驱动 + 实时数据流图计算<br>**例：**工厂设备数据实时流入本体图，异常自动触发处置流程 | 数字孪生和实时业务数据脱节，模型是死的 |
| 🟢 高 | 56 | [OntoEKG](https://github.com/LiberAI/OntoEKG) | LLM 按企业数据定制专属本体，用于企业知识图谱<br>**例：**按公司"客户-订单-产品"数据，自动定制企业专属本体 | 通用本体不合身，企业图谱建不起来 |
| 🟢 高 | 38 | [ummon](https://github.com/Nayshins/ummon) | 代码的"语义层"（Rust）：整个代码库变成可理解关系图<br>**例：**问"登录报错和哪个模块有关"，语义层给出关系图 | 代码库像迷宫，AI 理解不深、改错地方 |
| 🟢 高 | 33 | [khive](https://github.com/ohdearquant/khive) | 专门给 Agent 用的知识图谱：Agent 自己建/查/扩（Rust）<br>**例：**Agent 边干活边把学到的知识写进图谱，下次直接查 | Agent 的知识零散在对话里，无法积累复用 |
| 🟢 高 | 31 | [graphrag-engineering-pdfs](https://github.com/tvlnsiva/graphrag-engineering-pdfs) | 教学示例：本地 LLM + 本体 + 图 RAG 处理工程 PDF<br>**例：**照着教程，本地跑通"工程图纸 PDF → 知识图谱 → 问答" | 想学本地图 RAG，没有开箱即用的入门示例 |
| 🟡 中 | 10619 | [semantica](https://github.com/semantica-agi/semantica) | AI 的"记忆宫殿"：所有上下文建成可查询的关系图，决策可查可审<br>**例：**老板问"上次为什么选 A 方案"，Agent 能翻出当时的推理链条，而不是说"我忘了" | AI 决策像黑箱，出错没人能解释、追责，业务部门不敢用 |
| 🟡 中 | 2597 | [trustgraph](https://github.com/trustgraph-ai/trustgraph) | 给多个 AI 系统装"翻译官"：超图统一语义，行为可验证<br>**例：**销售 Agent 说"客户已签约"，财务系统显示没到款——超图自动发现两边说法对不上 | 多个 AI 系统数据各说各话、互相矛盾，出错时没人发现 |
| 🟡 中 | 684 | [jonex](https://github.com/jonexaiorg/jonex) | 万能文件变知识的成品引擎：多模态解析 → 本体化 → LLM Wiki<br>**例：**把 100 份 PDF 合同、表格、图片扔进去，变成能提问的"公司知识库" | 企业文件多而杂，找资料靠人肉翻，新人上手慢 |
| 🟡 中 | 225 | [vault-ld](https://github.com/The-Knowledge-Graph-Guys/vault-ld) | 让 Obsidian 笔记自动变"联网数据"：YAML-LD → RDF<br>**例：**笔记里写"张三-任职-某公司"，自动变成标准链接数据 | 个人/团队笔记是孤岛，无法和其他系统共享 |
| 🟡 中 | 100 | [memonto](https://github.com/shihanwan/memonto) | 给 Agent 记忆装"档案格式"：按本体存，可自动扩展本体<br>**例：**Agent 记住"客户 A 偏好低价"，按本体归档，下次直接调用 | Agent 记忆一团浆糊，跨会话就忘、还不准 |
| 🟡 中 | 71 | [metronix-memory](https://github.com/mtrnix/metronix-memory) | 自托管 Agent"记忆 U 盘"：MCP 原生、支持本地模型<br>**例：**本地部署一个记忆服务，Agent 重启后还记得上次聊到哪 | Agent 没有长期记忆，每次对话从零开始 |
| 🟡 中 | 39 | [ontoindex](https://github.com/ontograph/ontoindex) | 超大代码库的"目录索引"：代码变本体+句子索引，MCP 查询<br>**例：**100 万行代码的仓库，Agent 问"支付模块在哪"秒答 | 大代码库 Agent 找不到文件，理解成本高 |
| 🟡 中 | 39 | [ontosphere](https://github.com/boricles/ontosphere) | 可视化"本体画板"：PDF→本体→拖拽编辑→版本对比<br>**例：**把 50 页 PDF 规范变成可视化本体图，拖拽就能改 | 本体看不见摸不着，业务人员没法参与评审 |
| 🟡 中 | 33 | [SEPA](https://github.com/vaimee/SEPA) | Agent 之间的"微信群"：语义事件总线，SPARQL 订阅<br>**例：**库存 Agent 发"缺货"事件，采购 Agent 自动订阅响应 | 系统间事件传递靠硬编码，加个系统就要改代码 |
| 🟡 中 | 28 | [brick-llm](https://github.com/EURAC-EEBgroup/brick-llm) | 建筑界"标准本体+Agent"示范：BRICK 本体 + LangGraph<br>**例：**问"三楼会议室空调坏了找谁"，Agent 按建筑本体给出答案 | 建筑运维知识没人整理，排障全靠老师傅 |
| 🟡 中 | 19 | [ontology-mcp-self-healing](https://github.com/cloudbadal007/ontology-mcp-self-healing) | "自愈型"多 Agent：库表变了，本体+MCP 让 Agent 自动适应<br>**例：**数据库加了新表，Agent 自动更新本体、继续干活 | 业务表结构一改，Agent 就"失灵"，维护成本高 |
| ⚪ 低 | 81 | [public-data-lens](https://github.com/hike-lab/public-data-lens) | Agent 的"数据超市导购"：MCP 帮 Agent 找/比/评数据集<br>**例：**Agent 要"城市房价数据"，它自动找到并评估 3 个候选数据集 | 找公开数据靠人工搜索，质量好坏没把握 |
| ⚪ 低 | 20 | [sz-semantics](https://github.com/senzing-garage/sz-semantics) | 小工具：实体消歧 JSON → 图/语义格式转换<br>**例：**把清洗好的实体数据转成图格式，供下游使用 | 数据格式转换琐碎重复（边缘小工具） |

## F. 多 Agent 协同框架（11 个）

> 让多个 Agent 组队上班：分工、协作、通信、约束；解决单 Agent 走极端

| 相关性 | Stars | 项目 | 大白话（示例） | 解决什么业务问题 |
|:---:|:---:|------|------|------|
| 🟢 高 | 264 | [Symbio](https://github.com/854875058/Symbio) | 国产多 Agent 全家桶：动态 DAG + 本体化记忆 + 神经符号安全<br>**例：**市场 Agent 和客服 Agent 协作处理客户投诉，全程用统一记忆和规则 | 多个 Agent 协作时各自为政，记忆和规则对不上 |
| 🟢 高 | 45 | [sixb](https://github.com/sixb-ai/sixb) | 人和 AI 共用一套操作软件，两边看到的数据一致<br>**例：**人和 AI 共用一个工作台，人改数据 AI 立刻看到 | 人和 AI 各干各的，两边数据不同步 |
| 🟢 高 | 39 | [sofagent](https://github.com/KongFangXun/sofagent) | 企业 AI 的"安全带"：24 条规则审计 + 快照回滚<br>**例：**Agent 删库前被规则拦下，操作记录还能回滚 | AI 操作失误会造成事故，没有保险丝 |
| 🟢 高 | 38 | [objectstack](https://github.com/objectstack-ai/objectstack) | "小到 AI 能整体看懂"的应用框架：模型/UI/流程/权限一体<br>**例：**做一个"订单管理"应用，模型/界面/流程一体生成，AI 全看懂 | 应用太大太复杂，AI 无法整体理解、无从下手 |
| 🟢 高 | 33 | [SEPA](https://github.com/vaimee/SEPA) | Agent 之间的"微信群"：语义事件总线，SPARQL 订阅<br>**例：**库存 Agent 发"缺货"事件，采购 Agent 自动订阅响应 | 系统间事件传递靠硬编码，加个系统就要改代码 |
| 🟢 高 | 20 | [tardygrada](https://github.com/fabio-rovai/tardygrada) | AI 的"安检通道"：每个论断过 8 层验证才放行（C 语言）<br>**例：**Agent 输出"客户流失率 30%"，先过 8 层验证再给你 | AI 输出不可信，关键决策不敢用 |
| 🟡 中 | 2597 | [trustgraph](https://github.com/trustgraph-ai/trustgraph) | 给多个 AI 系统装"翻译官"：超图统一语义，行为可验证<br>**例：**销售 Agent 说"客户已签约"，财务系统显示没到款——超图自动发现两边说法对不上 | 多个 AI 系统数据各说各话、互相矛盾，出错时没人发现 |
| 🟡 中 | 203 | [MemGraphRAG](https://github.com/XMUDeepLIT/MemGraphRAG) | [KDD 2026] 有记忆的多 Agent 图检索，团队越干越聪明<br>**例：**多个 Agent 共用一个记忆图谱，A 发现的规律 B 直接能用 | Agent 团队没有集体记忆，每次都在重新摸索 |
| 🟡 中 | 45 | [persistent-mind-model-v1.0](https://github.com/scottonanski/persistent-mind-model-v1.0) | 给 AI 可回放的人格：记忆/反思/承诺全部事件化可审计<br>**例：**AI 承诺"明天跟进客户"，这个承诺被记录、可回放、可检查 | AI 说过的话不认账，出了问题无法审计 |
| 🟡 中 | 31 | [ad4m-core-deprecated](https://github.com/coasys/ad4m-core-deprecated) | 元本体思路开山作：Agent 间"共同语言"（已停更）<br>**例：**两个异构系统通过共同元本体互相理解（思路参考） | 异构系统"语言不通"，集成靠定制开发（已停更，作思路参考） |
| 🟡 中 | 20 | [sign-lang](https://github.com/sign-protocol/sign-lang) | Agent 企业的"合同语言"：图记号定义知识契约<br>**例：**用图记号定义"数据所有权"契约，Agent 之间按契约协作 | Agent 协作没有业务契约，越权、扯皮难界定 |

## G. MCP 本体/工具服务（14 个）

> 本体"插座"：MCP 标准接口，任何 Agent 插上就用；解决本体建好但 Agent 用不上

| 相关性 | Stars | 项目 | 大白话（示例） | 解决什么业务问题 |
|:---:|:---:|------|------|------|
| 🟢 高 | 102 | [OpenCrab](https://github.com/AlexAI-MCP/OpenCrab) | "世界本体操作系统"：9 语义空间 + Neo4j 验证 + MCP 插座<br>**例：**用 MCP 连上"餐饮本体空间"，Agent 自动懂菜品分类和配料规则 | 本体建好了但没有标准接口，Agent 用不上 |
| 🟢 高 | 81 | [public-data-lens](https://github.com/hike-lab/public-data-lens) | Agent 的"数据超市导购"：MCP 帮 Agent 找/比/评数据集<br>**例：**Agent 要"城市房价数据"，它自动找到并评估 3 个候选数据集 | 找公开数据靠人工搜索，质量好坏没把握 |
| 🟢 高 | 71 | [metronix-memory](https://github.com/mtrnix/metronix-memory) | 自托管 Agent"记忆 U 盘"：MCP 原生、支持本地模型<br>**例：**本地部署一个记忆服务，Agent 重启后还记得上次聊到哪 | Agent 没有长期记忆，每次对话从零开始 |
| 🟢 高 | 39 | [ontoindex](https://github.com/ontograph/ontoindex) | 超大代码库的"目录索引"：代码变本体+句子索引，MCP 查询<br>**例：**100 万行代码的仓库，Agent 问"支付模块在哪"秒答 | 大代码库 Agent 找不到文件，理解成本高 |
| 🟢 高 | 21 | [ontoloom](https://github.com/ExtensityAI/ontoloom) | 最纯粹的"本体 MCP 插座"：让 Agent 直接建/查 OWL 2 本体<br>**例：**用 MCP 直接让 Agent 建一个"设备-位置"本体并查询 | 本体工具和 Agent 之间没有桥，建了没人用 |
| 🟢 高 | 20 | [ontoskills](https://github.com/mareasw/ontoskills) | 把 Agent 技能（SKILL.md）编译成规范本体 RDF/Turtle<br>**例：**把公司内部 SKILL.md 技能说明编译成本体，全公司 Agent 共享 | Agent 技能散落各处，没法统一管理和复用 |
| 🟢 高 | 19 | [ontology-mcp-self-healing](https://github.com/cloudbadal007/ontology-mcp-self-healing) | "自愈型"多 Agent：库表变了，本体+MCP 让 Agent 自动适应<br>**例：**数据库加了新表，Agent 自动更新本体、继续干活 | 业务表结构一改，Agent 就"失灵"，维护成本高 |
| 🟡 中 | 682 | [HugAgentOS](https://github.com/ZJU-REAL/HugAgentOS) | 浙大企业级 AgentOS：本体做"交通法规"，违规操作被拦截纠正<br>**例：**Agent 想越权查工资数据，本体规则当场拦截并纠正它 | Agent 乱操作没人管，企业不敢放权给它干活 |
| 🟡 中 | 643 | [context-ontology-accelerator](https://github.com/aws/context-ontology-accelerator) | AWS 官方"懂规矩的上下文管家"：本体推理 + SPARQL + MCP<br>**例：**给 Agent 配好"报销规则本体"，它就知道哪些发票能报、哪些不能 | Agent 不懂公司规矩，每次干活都要重新教一遍 |
| 🟡 中 | 437 | [ontopilot](https://github.com/deeplethe/ontopilot) | 本体界的"GitHub+工厂"：文档→本体→审核→发布→MCP 输出<br>**例：**把公司制度文档丢进去，AI 起草出"报销流程本体"，专家审核后自动发布 | 手工建本体要请专家，又慢又贵，建完还没人维护 |
| 🟡 中 | 264 | [Symbio](https://github.com/854875058/Symbio) | 国产多 Agent 全家桶：动态 DAG + 本体化记忆 + 神经符号安全<br>**例：**市场 Agent 和客服 Agent 协作处理客户投诉，全程用统一记忆和规则 | 多个 Agent 协作时各自为政，记忆和规则对不上 |
| 🟡 中 | 180 | [flexible-graphrag](https://github.com/stevereiner/flexible-graphrag) | "存储兼容王"：15 图库+4 RDF+10 向量库，带 UI/MCP<br>**例：**想用 Neo4j 就用 Neo4j，想换 Memgraph 改一行配置 | 图 RAG 绑定单一存储，换库就得重写 |
| 🟡 中 | 38 | [ummon](https://github.com/Nayshins/ummon) | 代码的"语义层"（Rust）：整个代码库变成可理解关系图<br>**例：**问"登录报错和哪个模块有关"，语义层给出关系图 | 代码库像迷宫，AI 理解不深、改错地方 |
| 🟡 中 | 17 | [ontology-driven-agent](https://github.com/yql210/ontology-driven-agent) | 最小教学示例：一个按本体规矩干活的 Agent 长什么样<br>**例：**最小 Demo：让 Agent 只做本体允许的事 | 不知道"本体驱动 Agent"长什么样，先看个 Demo |

## H. 知识引擎/领域应用（10 个）

> "装好就能用的整机"：特定领域本体+解析+检索+Agent 打包成品

| 相关性 | Stars | 项目 | 大白话（示例） | 解决什么业务问题 |
|:---:|:---:|------|------|------|
| 🟢 高 | 684 | [jonex](https://github.com/jonexaiorg/jonex) | 万能文件变知识的成品引擎：多模态解析 → 本体化 → LLM Wiki<br>**例：**把 100 份 PDF 合同、表格、图片扔进去，变成能提问的"公司知识库" | 企业文件多而杂，找资料靠人肉翻，新人上手慢 |
| 🟢 高 | 80 | [software-periodic-table](https://github.com/NullLabTests/software-periodic-table) | 软件的"元素周期表"：115 个零件，编码 Agent 搭积木<br>**例：**要做"表单提交"功能，Agent 从 115 个零件里挑合适的拼装 | Agent 写代码质量不可控，组件没法复用 |
| 🟢 高 | 28 | [brick-llm](https://github.com/EURAC-EEBgroup/brick-llm) | 建筑界"标准本体+Agent"示范：BRICK 本体 + LangGraph<br>**例：**问"三楼会议室空调坏了找谁"，Agent 按建筑本体给出答案 | 建筑运维知识没人整理，排障全靠老师傅 |
| 🟡 中 | 77 | [OntoFlow](https://github.com/ThutmoseAI/OntoFlow) | "会演化的数字孪生"：本体驱动 + 实时数据流图计算<br>**例：**工厂设备数据实时流入本体图，异常自动触发处置流程 | 数字孪生和实时业务数据脱节，模型是死的 |
| 🟡 中 | 56 | [OntoEKG](https://github.com/LiberAI/OntoEKG) | LLM 按企业数据定制专属本体，用于企业知识图谱<br>**例：**按公司"客户-订单-产品"数据，自动定制企业专属本体 | 通用本体不合身，企业图谱建不起来 |
| 🟡 中 | 45 | [sixb](https://github.com/sixb-ai/sixb) | 人和 AI 共用一套操作软件，两边看到的数据一致<br>**例：**人和 AI 共用一个工作台，人改数据 AI 立刻看到 | 人和 AI 各干各的，两边数据不同步 |
| 🟡 中 | 45 | [ethereum-eips-ontology](https://github.com/prototypo/ethereum-eips-ontology) | 区块链"新华字典"：以太坊术语整理成的规范本体<br>**例：**查"EIP-1559 是什么"，给出准确定义和关联提案 | 区块链术语混乱，查资料靠零散文档 |
| 🟡 中 | 39 | [ontoindex](https://github.com/ontograph/ontoindex) | 超大代码库的"目录索引"：代码变本体+句子索引，MCP 查询<br>**例：**100 万行代码的仓库，Agent 问"支付模块在哪"秒答 | 大代码库 Agent 找不到文件，理解成本高 |
| 🟡 中 | 38 | [ummon](https://github.com/Nayshins/ummon) | 代码的"语义层"（Rust）：整个代码库变成可理解关系图<br>**例：**问"登录报错和哪个模块有关"，语义层给出关系图 | 代码库像迷宫，AI 理解不深、改错地方 |
| 🟡 中 | 38 | [objectstack](https://github.com/objectstack-ai/objectstack) | "小到 AI 能整体看懂"的应用框架：模型/UI/流程/权限一体<br>**例：**做一个"订单管理"应用，模型/界面/流程一体生成，AI 全看懂 | 应用太大太复杂，AI 无法整体理解、无从下手 |

---

## 一页纸总结：怎么选

| 你的目标 | 看哪个分类 | 最值得先看 |
|---------|-----------|-----------|
| 想把公司文档变成正式本体，还要人审核把关 | B. 本体工程工具 | ontopilot |
| 想全自动让 AI 从资料里学出本体 | C. 本体学习/抽取 | ontocast、OntoLearner |
| 想让 Agent 干活时严格按规矩来 | D. 本体驱动 Agent | HugAgentOS、memonto |
| 想快速让现有 Agent 用上本体能力 | G. MCP 服务 | ontoloom、OpenCrab |
| 想要高质量 RAG 问答（懂关系链） | E. GraphRAG | VeritasGraph、flexible-graphrag |
| 想体验完整成品 | H. 知识引擎 | jonex |
| 想了解底层原理、看大项目 | A. 基础设施 | semantica |
| 想多 Agent 协作干活 | F. 协同框架 | Symbio |
