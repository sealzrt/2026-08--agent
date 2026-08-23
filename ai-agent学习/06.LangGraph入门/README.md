# LangGraph 入门教程

> 面向**有服务端 / 前端开发经验、但 Python 基础较弱**的开发者的 LangGraph 入门教程。
> 以贯穿项目"资料检索与总结 Agent"为主线，从普通函数一步步演进到可工程化的 Agent 工作流。

**开始之前，建议先花 3 分钟看这两份：**

- 📍 [**学习地图**](./学习地图.md)——贯穿项目怎么从 0 长大、章节依赖关系、每章一句话总览
- 📖 [**术语表**](./术语表.md)——查概念、查报错、易混概念对照

## 5 分钟快速体验

不想先读文档？直接跑起来看效果（约 5 分钟）：

```powershell
# 1. 安装依赖（在 06.LangGraph入门 目录下）
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements_full.txt

# 2. 跑第一个 LangGraph
cd code/step_by_step
python 03_first_graph.py

# 3. 跑完整 Agent（会提问，直接回车默认主题，批准默认 y 回车）
cd ../langgraph_intro_project
python examples/run_graph.py

# 4. 跑全部测试
pytest
```

跑通之后，你会看到一个 Agent 完成"分析 → 检索 → 总结 → 评分 → 草稿 → 人工确认 → 报告"的全流程。然后回到第 01 章，带着"我见过终点了"的认知去学原理。

---

## 这是什么

16 章渐进式教程，教你用 LangGraph 构建有状态、有分支、有循环、有人工介入、可持久化、可落地的 Agent 工作流。

- 环境：**Python 3.10+，推荐 3.13；LangGraph 1.x 写法为主**
- 风格：每章"导读 → 目标 → 概念 → 代码 → 执行拆解 → 调试 → 练习 → 速查"
- 贯穿项目：资料检索与总结 Agent

## 学习路线

按五阶段推进，每个阶段结束都有一个可运行产物：

| 阶段 | 章节 | 目标 | 验收产物 |
|---|---|---|---|
| 一、最小认知 | 01-03 | 知道 LangGraph 是什么、能跑第一个图 | 最小 Python 项目 + 单节点图 |
| 二、核心图工作流 | 04-09 | 状态 / 节点 / 边 / 工具 / LLM / 循环 | 有分支、循环、工具、LLM 的 Agent |
| 三、真实应用能力 | 10-12 | 持久化 / 人工介入 / 流式输出 | 可恢复、可审批、可展示进度的 Agent |
| 四、工程化收尾 | 13-15 | 观测 / 测试 / 目录 / 部署 | 接近生产形态的完整项目 |
| 五、业务落地 | 16 | 架构分层 / 运行时 / 生产演进 | 能向团队解释的落地架构图 |

## 目录导航

| 资源 | 说明 |
|---|---|
| `01` ~ `16` 章 md | 教程正文（主线章节） |
| `学习地图.md` | **先看这个**：项目演进总览、章节依赖、每章一句话 |
| `术语表.md` | 查概念、查报错、易混概念对照 |
| `LangGraph入门大纲.md` | 规划：章节安排、学习目标、参考资料 |
| `LangGraph入门教程方案.md` | 规划：写作方案、代码组织、验收标准 |
| `LangGraph入门优化方案.md` | 规划：本目录升级方案（含与 LangGraph-笔记 的标杆对比） |
| `code/step_by_step/` | 前 13 章单文件示例（01-13 逐章对应） |
| `code/langgraph_intro_project/` | 完整项目（第 07 章起逐步引用，第 14-15 章收束） |
| `langgraph/` | 近 80 个 notebook 深度练习（进阶阅读） |
| `requirements_full.txt` | 依赖清单 |

## 环境要求

```powershell
# 在 06.LangGraph入门 目录下
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements_full.txt
```

真实模式（第 08 章起）需要模型 API Key，配置方式见各章"代码运行方式"；`langgraph/` 下 notebook 也可能调用真实模型，注意成本和输出清理。

## 快速开始

```powershell
cd code/step_by_step
python 03_first_graph.py          # 第一个 LangGraph

cd ../langgraph_intro_project
python examples/run_graph.py      # 完整 Agent（默认模拟模式）
pytest                            # 运行全部测试
```

## 章节 ↔ 代码 ↔ 深度资料 索引

| 章节 | 单文件示例 | 项目代码 | notebook 深挖 | 笔记加深阅读 |
|---|---|---|---|---|
| 01 LangGraph 是什么 | `step_by_step/01_basic_flow.py` | — | — | `LangGraph-笔记/01-...` 的「1.0/1.1」 |
| 02 Python 最小基础 | `step_by_step/02_basic_function.py` | `app/state.py` | `chapter01/02_dataclass`、`03_pydantic` | `LangGraph-笔记/00-环境配置.md` |
| 03 第一个图 | `step_by_step/03_first_graph.py` | `app/graph.py` | `chapter01/01_graph` | `LangGraph-笔记/01-...` 的「2」 |
| 04 State | `step_by_step/04_state_graph.py` | `app/state.py` | `chapter01/04_reducer`、`05_addmessage`、`06_node_state`、`09_state` | `LangGraph-笔记/01-...` 的「3」 |
| 05 Node | `step_by_step/05_node_functions.py` | `app/nodes/` | `chapter01/07_node_overwrite`、`08_node_state` | `LangGraph-笔记/02-...` 的「5」 |
| 06 Edge | `step_by_step/06_conditional_edges.py` | `app/graph.py`（路由函数） | `chapter02/03_route`、`05_route2`、`07_defer` | `LangGraph-笔记/02-...` 的「4.2/4.3」 |
| 07 工具调用 | `step_by_step/07_tool_calling.py` | `app/tools/search_tool.py`、`app/nodes/search.py` | `chapter04/13_tool_call`、`14_tool_node` | `LangGraph-笔记/04-...` 工具部分 |
| 08 LLM 与 Prompt | `step_by_step/08_llm_mock.py`、`08_llm_real.py` | `app/llm.py`、`app/prompts/` | `chapter04/16_wrap_tool_call` | `LangGraph-笔记/01-...` 相关 |
| 09 循环与限制 | `step_by_step/09_loop_and_limit.py` | `app/graph.py`（循环边） | `chapter02/13_loop_goto`、`14_remaining_steps`、`15_end_loop`、`16_retry` | `LangGraph-笔记/02-...` 的「4.4」 |
| 10 持久化 | `step_by_step/10_persistence.py` | `app/graph.py`（checkpointer） | `chapter03/01_in_memory`、`02_in_SQL`、`04_history_state`、`08_replay` | `LangGraph-笔记/03-...` |
| 11 Human-in-the-loop | `step_by_step/11_human_in_the_loop.py` | `app/nodes/human_review.py` | `chapter04/01_HITL`、`03_approve`、`04_approve_edit`、`07_HITL_checkpoint` | `LangGraph-笔记/04-...` 的「8」 |
| 12 流式输出 | `step_by_step/12_stream_output.py`、`12_api.py` | `app/api/` | `chapter05/01_values`、`02_messages`、`04_custom` | `LangGraph-笔记/04-...` 部署部分 |
| 13 调试与测试 | `step_by_step/13_debug_and_test.py` | `tests/` | `chapter02/17_cache` | `LangGraph-笔记/02-...` 的「5」 |
| 14 项目化结构 | — | 整个 `app/` | — | `LangGraph-笔记/04-...` 部署部分 |
| 15 部署与生产化 | — | `app/api/`、`app/config.py` | — | `LangGraph-笔记/04-...` 部署部分 |
| 16 业务落地项目架构 | — | 整个项目 + 生产形态 | — | 前 15 章综合复盘 |

> 注：`notebook 深挖`列对应 `langgraph/chapter0X/` 目录下的文件（不带扩展名）；`笔记加深阅读`列对应工作区 `LangGraph-笔记/` 目录。

## 官方文档

- [LangGraph 概览](https://docs.langchain.com/oss/python/langgraph/overview)
- [Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api)
- [State 与 reducer](https://docs.langchain.com/oss/python/langgraph/state)
