# LangGraph 入门大纲

## 读者定位

本大纲面向有多年服务端和前端开发经验、但 Python 基础较弱的开发者。目标不是从零讲编程，而是补齐使用 LangGraph 所需的 Python 最小知识，并用一个贯穿项目理解 LangGraph 的工程化用法。

## 学习目标

- 理解 LangGraph 适合解决什么问题，以及它和 LangChain Agent 的关系。
- 掌握 LangGraph 的核心模型：`State`、`Node`、`Edge`、`StateGraph`、`START`、`END`。
- 能用 Python 编写简单、可调试、可扩展的图工作流。
- 能实现一个带工具调用、条件分支、循环、持久化和人工确认的 Agent 工作流。
- 能把示例代码整理成接近真实项目的目录结构、配置、日志和测试方式。

## 贯穿项目

项目名称：资料检索与总结 Agent

核心场景：

用户输入一个研究主题，系统完成任务拆解、资料检索、内容整理、质量检查、人工确认和最终报告生成。

最终能力：

- 接收用户问题。
- 判断是否需要检索资料。
- 调用工具获取资料。
- 对资料进行结构化总结。
- 判断总结是否足够完整。
- 必要时循环补充检索。
- 在关键步骤暂停，等待人工确认或修改。
- 保存会话状态，支持恢复执行。

## 章节安排

### 01. LangGraph 是什么

重点内容：

- Agent 工作流为什么需要图结构。
- 传统链式调用、状态机、工作流引擎和 LangGraph 的区别。
- LangGraph 的定位：低层级、可控、面向长时间运行和有状态 Agent 编排。
- LangGraph 与 LangChain、LangSmith 的关系。
- 什么时候应该使用 LangGraph，什么时候用普通函数、LangChain Agent 或传统任务队列更合适。

实践任务：

- 画出“资料检索与总结 Agent”的第一版流程图。
- 标出哪些步骤是确定流程，哪些步骤需要条件判断或循环。

### 02. Python 最小基础

重点内容：

- Python 项目结构：文件、包、模块、入口文件。
- 基础类型：`str`、`int`、`float`、`bool`、`list`、`dict`、`tuple`。
- 函数定义、参数、返回值、类型标注。
- `TypedDict`、`dataclass`、`BaseModel` 的使用场景。
- 虚拟环境与依赖管理：`venv`、`pip`、`uv`。
- `.env` 配置与环境变量。
- 同步函数与异步函数的基本区别。

实践任务：

- 创建一个最小 Python 项目。
- 编写 `config.py` 管理模型配置、API Key 和运行参数。
- 编写一个普通函数版的“输入主题 -> 返回固定总结”流程。

### 03. 第一个 LangGraph Hello World

重点内容：

- 安装 `langgraph`。
- 创建 `StateGraph`。
- 定义最小 `State`。
- 添加节点：`add_node`。
- 添加边：`add_edge`。
- 使用 `START` 和 `END`。
- 编译图：`compile()`。
- 执行图：`invoke()`。

实践任务：

- 把第 02 章的普通函数流程改造成 LangGraph。
- 创建一个单节点图：输入主题，输出固定总结。

阶段产出：

- 能运行的最小 LangGraph 示例。
- 理解“节点负责做事，边负责决定下一步”。

### 04. State：让工作流拥有共享上下文

重点内容：

- `State` 是图执行过程中的共享数据快照。
- 使用 `TypedDict` 定义状态结构。
- 节点如何读取状态。
- 节点如何返回局部状态更新。
- 默认更新行为：覆盖同名字段。
- 使用 reducer 合并多次更新。
- 消息型状态与普通业务状态的区别。

实践任务：

- 为贯穿项目定义第一版状态：
  - `topic`
  - `questions`
  - `documents`
  - `summary`
  - `quality_score`
  - `final_report`
- 编写节点更新不同字段。

阶段产出：

- 明确哪些数据应该进入 `State`，哪些数据应该作为临时变量或配置。

### 05. Node：把业务步骤拆成可测试函数

重点内容：

- 节点本质是 Python 函数。
- 节点的输入和输出约定。
- 同步节点与异步节点。
- 节点命名规范。
- 节点内部如何调用普通业务函数。
- 节点不应该承担过多职责。
- 如何单独测试节点函数。

实践任务：

- 拆分贯穿项目节点：
  - `analyze_topic`
  - `plan_search`
  - `search_documents`
  - `summarize_documents`
  - `evaluate_summary`
  - `generate_report`

阶段产出：

- 每个节点都是一个可以独立测试的小函数。

### 06. Edge：控制流程、分支和结束条件

重点内容：

- 普通边：固定顺序执行。
- 条件边：根据状态选择下一步。
- 条件入口。
- 结束节点 `END`。
- 为什么不要在同一个节点同时混用静态边和动态路由。
- 流程图如何映射到代码。

实践任务：

- 实现分支逻辑：
  - 如果问题足够简单，直接生成总结。
  - 如果需要外部资料，进入检索流程。
- 实现结束条件：
  - 总结质量达标则生成最终报告。
  - 总结质量不足则回到补充检索。

阶段产出：

- 一个带条件分支和循环的 LangGraph 工作流。

### 07. 工具调用：让 Agent 连接外部能力

重点内容：

- 工具函数和节点函数的区别。
- 如何封装搜索、数据库查询、HTTP API、文件读取等工具。
- 工具返回值如何写入 `State`。
- 工具调用失败时如何表达错误。
- 工具调用的超时、重试和降级策略。

实践任务：

- 编写一个模拟检索工具。
- 可选扩展：接入真实搜索 API 或本地文档检索。
- 将检索结果写入 `documents`。

阶段产出：

- `search_documents` 节点能够通过工具获取资料。

### 08. LLM 调用与提示词组织

重点内容：

- 在节点中调用大模型。
- Prompt 模板的组织方式。
- 结构化输出：让模型返回 JSON 或 Pydantic 对象。
- 如何把服务端开发中的“接口契约”思想迁移到 LLM 输出。
- 常见问题：幻觉、格式不稳定、上下文过长。

实践任务：

- `analyze_topic` 输出结构化检索计划。
- `summarize_documents` 输出结构化总结。
- `evaluate_summary` 输出质量分数和缺失点。

阶段产出：

- 工作流开始具备真实 Agent 行为，而不是固定字符串拼接。

### 09. 循环、重试与递归限制

重点内容：

- Agent 为什么需要循环。
- 如何设计可终止的循环。
- 用状态字段记录执行轮次。
- 设置最大检索次数或最大修正次数。
- 使用 `recursion_limit` 设置图运行时的最大递归步数。
- `recursion_limit` 在调用图时通过 config 传入，例如 `graph.invoke(input, {"recursion_limit": 100})`。
- 业务循环限制和 LangGraph 运行时递归限制的区别。
- 失败重试和业务重试的区别。
- 如何避免无限循环。
- 如何识别和处理图递归超限错误。

实践任务：

- 为贯穿项目增加 `iteration_count`。
- 当总结质量不足且未超过最大次数时继续检索。
- 超过最大次数后生成“当前最佳报告”并标记风险。
- 为图调用增加 `recursion_limit`，观察循环条件写错时的报错。

阶段产出：

- 一个可控的循环 Agent。

### 10. 持久化与会话恢复

重点内容：

- 为什么长时间运行的 Agent 需要持久化。
- checkpointer 的基本概念。
- `thread_id` 的作用。
- `checkpointer` 与 `store` 的边界：前者保存线程级短期执行状态，后者保存跨线程长期记忆。
- 内存型 checkpointer 的限制：进程重启后状态丢失。
- 生产环境持久化方案：SQLite、Postgres 或其他外部存储。
- 短期状态、长期记忆和外部数据库的边界。
- 会话恢复的基本流程。

实践任务：

- 为图增加内存型 checkpointer。
- 使用固定 `thread_id` 多次调用同一个会话。
- 观察状态如何在多次执行中保留。
- 对比“同一个 `thread_id`”和“不同 `thread_id`”下的状态差异。

阶段产出：

- Agent 可以保存和恢复执行状态。

### 11. Human-in-the-loop：人工确认与人工修改

重点内容：

- 哪些场景必须让人介入。
- 中断执行、查看状态、修改状态、继续执行。
- 使用 `interrupt()` 暂停图执行。
- 使用 `Command(resume=...)` 恢复图执行。
- 恢复执行时会从触发 `interrupt()` 的节点开头重新运行。
- `interrupt()` 之前的副作用必须幂等，或放到恢复之后执行。
- 不要把 `interrupt()` 包在 `try/except` 中捕获。
- 同一个节点内有多个 `interrupt()` 时，不要随意增删或重排。
- 人工反馈数据需要能被序列化，便于持久化和恢复。
- 人工介入节点必须和 checkpointer、`thread_id` 配合使用。
- 人工确认与审批流的区别。
- 如何设计给前端展示的中间状态。
- 如何避免把不可解释的黑盒结果直接交给用户。

实践任务：

- 在生成最终报告前暂停。
- 允许人工确认、驳回或补充要求。
- 根据人工反馈继续修改报告。
- 设计一个人工反馈 payload，例如 `{"approved": false, "comment": "补充风险说明"}`。

阶段产出：

- 一个可以被人工接管的 Agent 工作流。

### 12. 流式输出与前端集成

重点内容：

- 为什么 Agent 执行过程需要可视化。
- 节点级状态展示：等待中、执行中、完成、失败。
- 流式输出与最终状态的区别。
- 使用 `stream()` 获取图执行过程。
- 理解常见 stream mode：`updates`、`values`、`messages`、`custom`、`debug`。
- 区分 `graph.stream(..., stream_mode=...)` 和 `graph.stream_events(..., version="v3")`。
- `stream()` 适合按图执行模式输出状态更新或模型消息，`stream_events()` 适合前端消费类型化事件。
- 前端如何处理节点更新、模型 token、工具调用和 interrupt 事件。
- 前端如何展示图执行进度。
- 服务端接口如何包装 LangGraph 调用。

实践任务：

- 设计一个最小 API：
  - 创建任务。
  - 查询任务状态。
  - 提交人工反馈。
  - 获取最终报告。
- 设计一个流式事件结构，用于展示节点执行进度和中断状态。
- 设计一个简单前端页面展示每个节点的执行状态。

阶段产出：

- 从后端工作流过渡到可交互产品形态。

### 13. 调试、观测与测试

重点内容：

- 打印日志 vs 结构化日志。
- 如何记录每个节点的输入、输出和耗时。
- 使用 LangSmith 进行 trace、调试和评估的基本思路。
- 节点单元测试。
- 图级集成测试。
- 模型输出不稳定时如何写测试。

实践任务：

- 为每个节点增加基础日志。
- 为 `evaluate_summary` 编写单元测试。
- 为完整图编写一条集成测试。

阶段产出：

- 工作流具备基本可维护性。

### 14. 项目化目录结构

重点内容：

- 推荐目录结构：

```text
langgraph_intro_project/
  app/
    __init__.py
    config.py
    graph.py
    state.py
    nodes/
      analyze.py
      search.py
      summarize.py
      evaluate.py
      report.py
    tools/
      search_tool.py
    prompts/
      analyze.md
      summarize.md
      report.md
  tests/
    test_nodes.py
    test_graph.py
  .env.example
  pyproject.toml
  README.md
```

- 状态、节点、工具、提示词、图定义如何分层。
- 配置和业务代码如何解耦。
- 如何避免所有逻辑堆在一个文件里。

实践任务：

- 把前面章节代码整理成项目结构。
- 写一份 README，说明如何运行示例。

阶段产出：

- 一个接近真实工程的 LangGraph 入门项目。

### 15. 部署与生产化注意事项

重点内容：

- 本地脚本、Web API、后台任务三种运行方式。
- API 服务如何触发图执行。
- 长任务如何避免 HTTP 请求阻塞。
- 状态持久化如何从内存迁移到数据库。
- API Key、模型配置、权限控制。
- 成本控制、并发控制和超时控制。
- 常见故障处理。

实践任务：

- 用 FastAPI 包一层最小接口。
- 将图执行入口封装为服务函数。
- 为部署环境准备 `.env.example`。

阶段产出：

- 能作为后端服务调用的 LangGraph 示例。

## 建议学习节奏

### 第一阶段：能跑起来

覆盖章节：

- 01. LangGraph 是什么
- 02. Python 最小基础
- 03. 第一个 LangGraph Hello World
- 04. State：让工作流拥有共享上下文

目标：

- 能写出并运行一个最小 LangGraph。
- 能解释 `State`、`Node`、`Edge` 的作用。

### 第二阶段：能做出真实流程

覆盖章节：

- 05. Node：把业务步骤拆成可测试函数
- 06. Edge：控制流程、分支和结束条件
- 07. 工具调用：让 Agent 连接外部能力
- 08. LLM 调用与提示词组织
- 09. 循环、重试与递归限制

目标：

- 能做出一个有分支、有循环、有工具调用的 Agent。

### 第三阶段：能工程化落地

覆盖章节：

- 10. 持久化与会话恢复
- 11. Human-in-the-loop：人工确认与人工修改
- 12. 流式输出与前端集成
- 13. 调试、观测与测试
- 14. 项目化目录结构
- 15. 部署与生产化注意事项

目标：

- 能把示例整理成可维护项目。
- 能知道上线前还需要补哪些工程能力。

## 每章建议固定结构

为了后续扩展成完整教程，建议每章统一使用以下结构：

```text
1. 本章目标
2. 背景解释
3. 核心概念
4. 最小代码示例
5. 贯穿项目改造
6. 常见错误
7. 练习任务
8. 小结
```

## 重点概念速查

- `State`：图执行过程中的共享状态。
- `Node`：读取状态并返回状态更新的函数。
- `Edge`：决定下一个执行节点的连接关系。
- `StateGraph`：用于构建有状态图工作流的主要类。
- `START`：图的虚拟起点。
- `END`：图的虚拟终点。
- `compile()`：编译图，进行结构检查并生成可执行对象。
- `invoke()`：一次性执行图并返回结果。
- `checkpointer`：保存图执行状态，用于持久化和恢复。
- `thread_id`：区分不同会话或任务的标识。
- `human-in-the-loop`：允许人在执行过程中查看、修改或批准状态。

## 推荐前置知识

必须掌握：

- Python 函数、字典、列表、类型标注。
- HTTP API 的基本概念。
- JSON 数据结构。
- 基础命令行操作。

建议掌握：

- FastAPI 或其他 Web 框架的基本用法。
- 异步编程基本概念。
- 单元测试基本概念。
- 日志与配置管理。

可以后学：

- LangChain 高级组件。
- LangSmith 深度评估。
- 向量数据库和 RAG。
- 多 Agent 协作。

## 参考资料

- LangGraph 官方概览：https://docs.langchain.com/oss/python/langgraph/overview
- LangGraph Graph API：https://docs.langchain.com/oss/python/langgraph/graph-api
- LangGraph Graph API 使用指南：https://docs.langchain.com/oss/python/langgraph/use-graph-api
