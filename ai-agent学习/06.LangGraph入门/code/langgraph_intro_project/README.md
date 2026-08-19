# langgraph-intro-project

基于 LangGraph 的"资料检索与总结 Agent"贯穿项目（教程第 07 章起逐步引用，第 14~15 章收束）。

## 功能

- 分析主题，生成研究问题
- 制定检索计划并检索资料（模拟 / 真实可切换）
- 总结资料并评估质量，不达标时自动补充检索（业务循环）
- 生成报告草稿，经人工确认后输出最终报告
- 通过 `thread_id` 支持会话恢复，教程版 API 预留事件查看入口

## 目录结构

```text
app/
  config.py         配置中心（环境变量 / .env）
  state.py          状态结构
  graph.py          图定义
  llm.py            LLM 调用层（模拟 + 真实）
  nodes/            节点
  tools/            工具（检索）
  prompts/          Prompt 模板（.md）
  api/              FastAPI 接口层
tests/              单元测试 + 图级集成测试
examples/           本地脚本示例
```

## 安装

```powershell
cd code/langgraph_intro_project
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e .[test]
```

## 配置

```powershell
Copy-Item .env.example .env
# 默认 USE_MOCK=true 即可直接运行；真实模式需配置 OPENAI_API_KEY
```

## 运行

本地脚本（模拟模式）：

```powershell
python examples/run_graph.py
```

图直接运行：

```powershell
python -m app.graph
```

API 服务：

```powershell
uvicorn app.api.main:app --reload
```

接口：

```text
POST /tasks                       创建任务
GET  /tasks/{task_id}             查询任务状态
POST /tasks/{task_id}/feedback    提交人工反馈
GET  /tasks/{task_id}/events      获取事件
GET  /tasks/{task_id}/report      获取最终报告
```

## 测试

```powershell
pytest
```

## 生产化注意事项

详见教程第 15 章。要点：

- 内存型 checkpointer 仅用于教程，生产应使用 SQLite / Postgres 持久化
- 长任务不要阻塞 HTTP 请求，应改为队列 + Worker
- 限制最大循环次数、设置 `recursion_limit`
- 工具调用设置超时，区分技术重试与业务循环
- 人工审批记录审批人、审批时间、审批意见
- `.env` 不要提交到仓库，只提交 `.env.example`
