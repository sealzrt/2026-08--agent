# 本体论 + Agent 开源项目深度评估

> 评估时间：2026-08-24  
> 评估维度：① 本体论落地 ② 本地运行 ③ 非工作流重心（每项 1~10 分）

---

## 综合评分表

| 项目 | 本体论落地 | 本地运行 | 非工作流重心 | 总分 | 结论 |
|------|:---:|:---:|:---:|:---:|------|
| **deeplethe/ontopilot** | 10 | 8 | 10 | **28** | 最推荐 |
| **growgraph/ontocast** | 9 | 9 | 9 | **27** | 强烈推荐 |
| **AlexAI-MCP/OpenCrab** | 8 | 9 | 8 | **25** | 推荐 |
| **aitomatic/dana** | 8 | 8 | 9 | **25** | 推荐 |
| **shihanwan/memonto** | 6 | 9 | 9 | **24** | 本体论较浅 |
| **ZJU-REAL/HugAgentOS** | 8 | 9 | 5 | **22** | 有保留（AgentOS 平台，工作流较重） |
| **aws/context-ontology-accelerator** | 9 | 4 | 9 | **22** | 本体强，但本地依赖 AWS CDK |
| **NullLabTests/software-periodic-table** | 5 | 9 | 8 | **22** | "本体"是软件工程元素，非领域本体 |
| **trustgraph-ai/trustgraph** | 6 | 8 | 6 | **20** | 超图为主，本体非核心 |

---

## 详细分析

### 🥇 deeplethe/ontopilot（437 stars）— 最推荐

**GitHub**: https://github.com/deeplethe/ontopilot

**本体论落地（10分）**
- 完整实现 **TBox（类/属性公理）+ SKOS（受控术语）+ ABox（实例数据）** 三层本体工程
- 支持 OWL 本体抽取、审查、版本控制、发布、SPARQL 查询、REST API 服务
- 有专门的领域专家审查队列（冲突、实体消歧、术语、ABox 校验），是真正的本体生产工作台
- 基准测试中超过 OntoLearner 参考线（+55.6% F1）

**本地运行（8分）**
- Docker Compose 一键部署，也支持 SQLite 本地开发模式
- 需要配置 LLM API（OpenAI 兼容），但应用本身完全自托管

**非工作流重心（10分）**
- 核心完全是本体论工程，不是工作流/编排工具

**技术栈**: React + TypeScript 前端 / FastAPI 后端 / PostgreSQL / Oxigraph RDF

**快速启动**:
```bash
git clone https://github.com/deeplethe/ontopilot.git
cd ontopilot
cp .env.example .env
cp backend/.env.example backend/.env
docker compose up -d --build
# 访问 http://localhost:8080
```

---

### 🥈 growgraph/ontocast（228 stars）— 强烈推荐

**GitHub**: https://github.com/growgraph/ontocast

**本体论落地（9分）**
- 从非结构化文档自动抽取 RDF 知识图谱，本体与事实并行共进化
- 支持 SHACL 验证、RDF 1.2 出处、实体消歧、LanceDB/Qdrant 本体向量检索
- 可直接嵌入 LangGraph Agent 作为节点

**本地运行（9分）**
- `uv add "ontocast[server,openai]"` 直接安装，`ontocast serve` 本地启动
- 默认用内存 pyoxigraph 存储，无需外部依赖

**非工作流重心（9分）**
- 核心是本体抽取引擎，不是工作流工具

**技术栈**: Python / pyoxigraph / LanceDB / SHACL

**快速启动**:
```bash
uv add "ontocast[server,openai,doc-processing,lancedb,shacl]"
cp .env.example .env
ontocast serve
curl -X POST http://localhost:8999/process -F "file=@document.pdf"
```

---

### 🥉 AlexAI-MCP/OpenCrab（102 stars）— 推荐

**GitHub**: https://github.com/AlexAI-MCP/OpenCrab

**本体论落地（8分）**
- MetaOntology OS 定义了 9 个语义空间（subject/resource/evidence/concept/claim/community/outcome/lever/policy）
- 有 Neo4j 验证、CrabHarness 证据收集、MCP 工具服务本体

**本地运行（9分）**
- `pip install -e ".[dev]"` + `opencrab serve`，SQLite + Chroma 本地存储

**非工作流重心（8分）**
- 本体工厂为核心，但 CrabHarness 任务编排有一定工作流色彩

**快速启动**:
```bash
pip install -e ".[dev]"
opencrab serve
opencrab status
```

---

### aitomatic/dana（59 stars）— 推荐

**GitHub**: https://github.com/aitomatic/dana

**本体论落地（8分）**
- 领域感知神经符号 Agent，能从文档自动构建本体
- Agent 原生编程语言，本体是一等公民

**本地运行（8分）**
- pip 安装，支持本地运行

**非工作流重心（9分）**
- 核心是神经符号 + 本体，非工作流

---

### ZJU-REAL/HugAgentOS（682 stars）— 有保留

**GitHub**: https://github.com/ZJU-REAL/HugAgentOS

**本体论落地（8分）**
- 将领域本体作为 Agent 推理的"控制平面"，理念很强
- 但文档明确说明：本体信任控制平面是企业版目标架构，正在分阶段集成，社区版本体功能受限

**本地运行（9分）**
- 一键 curl 安装，Python 3.11+，SQLite，支持本地模型，体验极佳

**非工作流重心（5分）**
- 本质是 AgentOS 平台，聊天、RAG、子 Agent、技能、自动化批处理等功能非常多，有较重的工作流属性

**快速启动**:
```bash
curl -fsSL https://raw.githubusercontent.com/ZJU-REAL/HugAgentOS/main/install.sh | bash
# 访问 http://127.0.0.1:3001
```

---

### aws/context-ontology-accelerator（643 stars）— 本体强，本地弱

**GitHub**: https://github.com/aws/context-ontology-accelerator

**本体论落地（9分）**
- 包含本体引擎（HermiT/ELK 推理器）、SPARQL 联邦查询（VKG/Ontop）、MCP Server
- 完整的 Scan → Model → Serve 三阶段本体流水线

**本地运行（4分）**
- 依赖 AWS CDK（TypeScript）部署，本地主要用于测试
- 依赖 Java 17 + Gradle（Smithy 代码生成），复杂度高

---

## 最终推荐

```
本体论落地深度排序：
OntoPilot > OntoCast > OpenCrab ≈ HugAgentOS ≈ Dana

综合三项要求后推荐：

第一选择：deeplethe/ontopilot   ← 本体论工程最专业，产品最成熟
第二选择：growgraph/ontocast    ← 本地运行最轻，嵌入 Agent 最灵活
第三选择：aitomatic/dana        ← 神经符号路线独特，自动构建本体
```

> 如果只选一个，**OntoPilot** 是本体论落地的最优解——它是唯一一个完整覆盖 TBox/SKOS/ABox 全流程、有人工审查队列、版本发布和 SPARQL 服务的项目。
