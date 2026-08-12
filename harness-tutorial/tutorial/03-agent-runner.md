# 第 3 章：实现 Agent Runner

## 学习目标

完成本章后，你应该能够：

- 说明 Agent Runner 的职责
- 理解 Task 如何传入 Agent Runner
- 设计结构化运行结果
- 区分执行成功、执行失败和评估失败

## 核心概念

### Agent Runner

Agent Runner 是 Harness 中负责执行任务的模块。它接收 Task，构造给 Agent 的输入，调用模型或本地模拟逻辑，并返回结构化结果。

### 结构化结果

Agent Runner 不应该只返回一段文本。它应该返回稳定字段，方便后续 Trace、Evaluator 和 Report 使用。

推荐结果结构：

```json
{
  "task_id": "task-001",
  "status": "success",
  "answer": "评估流程能让 Agent 输出可验证，并形成结论。",
  "tool_calls": [],
  "error": null
}
```

## Agent Runner 的边界

Agent Runner 负责：

- 接收单个任务
- 生成 Agent 输入
- 调用模型或模拟执行逻辑
- 捕获执行错误
- 返回结构化结果

Agent Runner 不负责：

- 加载 YAML 文件
- 写 Trace 文件
- 判断输出是否通过
- 生成最终报告

这些职责分别属于 `Task Loader`、`Trace Logger`、`Evaluator` 和 `Report Writer`。

## 操作步骤

本章对应文件：

```text
agent-harness-demo/src/agent_runner.py
agent-harness-demo/tests/test_agent_runner.py
```

### 步骤 1：定义输入

Agent Runner 的输入来自任务文件中的单个任务。

示例任务：

```yaml
id: task-001
name: summarize_agent_evaluation
input: "请用不超过 120 字解释为什么 Agent 开发需要评估流程，并给出结论。"
expected:
  must_include:
    - "评估"
    - "结论"
constraints:
  max_words: 120
```

### 步骤 2：定义输出

输出建议包含：

- `task_id`
- `status`
- `answer`
- `tool_calls`
- `error`

示例：

```json
{
  "task_id": "task-001",
  "status": "success",
  "answer": "Agent 开发需要评估流程来稳定判断输出质量，避免只凭主观感觉修改 Prompt。结论是评估能提升可复现性。",
  "tool_calls": [],
  "error": null
}
```

### 步骤 3：处理异常

如果执行失败，也要返回结构化结果：

```json
{
  "task_id": "task-001",
  "status": "error",
  "answer": "",
  "tool_calls": [],
  "error": "model request timeout"
}
```

这样后续 Trace 和 Report 才能显示失败原因。

### 步骤 4：创建 Python Agent Runner

入门阶段可以先使用模拟 Agent，不急着接入真实模型。重点是理解 Harness 流程。

创建文件：

```text
agent-harness-demo/src/agent_runner.py
```

写入代码：

```python
from typing import Any


def run_task(task: dict[str, Any], tools: Any | None = None) -> dict[str, Any]:
    answer = build_mock_answer(task)

    return {
        "task_id": task["id"],
        "status": "success",
        "answer": answer,
        "tool_calls": [],
        "error": None,
    }


def build_mock_answer(task: dict[str, Any]) -> str:
    required_texts = task.get("expected", {}).get("must_include", [])
    if required_texts:
        joined = "、".join(required_texts)
        return f"这是任务 {task['id']} 的模拟回答，包含 {joined}。"

    return f"这是任务 {task['id']} 的模拟回答。"
```

真实模型接入可以放到后续迭代。

### 步骤 5：添加 Agent Runner 测试

创建文件：

```text
agent-harness-demo/tests/test_agent_runner.py
```

写入测试：

```python
from src.agent_runner import run_task


def test_run_task_returns_structured_result():
    task = {
        "id": "task-001",
        "name": "summarize",
        "input": "请总结文本。",
        "expected": {"must_include": ["评估", "结论"]},
        "constraints": {"max_words": 120},
    }

    result = run_task(task)

    assert result["task_id"] == "task-001"
    assert result["status"] == "success"
    assert "评估" in result["answer"]
    assert "结论" in result["answer"]
    assert result["tool_calls"] == []
    assert result["error"] is None
```

运行本章测试：

```bash
cd harness-tutorial/agent-harness-demo
python -m pytest tests/test_agent_runner.py
```

## 示例

Agent Runner 的最小接口可以设计为：

```python
def run_task(task: dict, tools: dict | None = None) -> dict:
    """执行单个任务并返回结构化结果。"""
```

调用方式：

```python
result = run_task(task)
print(result["task_id"])
print(result["status"])
print(result["answer"])
```

## 检查点

- [ ] 能说明 Agent Runner 的职责边界
- [ ] Runner 接收单个 Task
- [ ] Runner 返回 `task_id`、`status`、`answer`、`tool_calls`、`error`
- [ ] 执行失败时不会直接让整个流程崩溃
- [ ] 能说明为什么 Runner 不负责评估结果
- [ ] `tests/test_agent_runner.py` 可以通过
