# 第 6 章：设计 Evaluator

## 学习目标

完成本章后，你应该能够：

- 说明 Evaluator 的作用
- 设计基础规则评估
- 实现 `must_include` 检查
- 实现 `max_words` 检查
- 输出可读的失败原因

## 核心概念

### Evaluator

Evaluator 用于判断 Agent 输出是否满足任务要求。它把主观判断转成可重复执行的规则。

### 规则评估

规则评估是最适合入门阶段的评估方式。它不依赖另一个模型，而是使用明确条件判断结果。

### 失败原因

失败原因用于告诉开发者为什么没有通过。它应该指向具体规则，而不是只返回 `false`。

## 第一版评估规则

本教程第一版只实现两类规则：

- `must_include`：输出必须包含指定词语
- `max_words`：输出不能超过指定字数

任务示例：

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

对应输出如果是：

```text
Agent 开发需要评估流程来稳定判断输出质量。结论是评估能提升可复现性。
```

则通过原因是：

- 包含 `评估`
- 包含 `结论`
- 字数不超过 120

## 评估结果结构

Evaluator 建议返回：

```json
{
  "task_id": "task-001",
  "passed": true,
  "reasons": []
}
```

失败时：

```json
{
  "task_id": "task-001",
  "passed": false,
  "reasons": [
    "missing required text: 结论",
    "output exceeds max_words: 120"
  ]
}
```

## 操作步骤

本章对应文件：

```text
agent-harness-demo/src/evaluator.py
agent-harness-demo/tests/test_evaluator.py
```

### 步骤 1：读取任务规则

从 Task 中读取：

- `expected.must_include`
- `constraints.max_words`

### 步骤 2：读取 Agent 输出

从 Agent Runner 结果中读取：

- `task_id`
- `answer`
- `status`
- `error`

如果 `status` 是 `error`，评估结果应直接失败。

### 步骤 3：检查 must_include

逐个检查关键词是否出现在输出中。

核心代码：

```python
for text in task["expected"]["must_include"]:
    if text not in answer:
        reasons.append(f"missing required text: {text}")
```

### 步骤 4：检查 max_words

中文场景下，入门阶段可以先采用简单字符长度或粗略分词策略。为了保持教程简单，可以把 `max_words` 理解为最大字符数或最大词数，并在项目 README 中说明。

建议第一版使用最大字符数，字段仍保留 `max_words`，因为它表达的是输出长度限制。

核心代码：

```python
if len(answer) > task["constraints"]["max_words"]:
    reasons.append(f"output exceeds max_words: {task['constraints']['max_words']}")
```

### 步骤 5：返回评估结果

如果 `reasons` 为空，则通过。

```python
passed = len(reasons) == 0
```

### 步骤 6：实现 Python Evaluator

创建文件：

```text
agent-harness-demo/src/evaluator.py
```

写入代码：

```python
from typing import Any


def evaluate(task: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
    reasons: list[str] = []
    task_id = task["id"]

    if result.get("status") == "error":
        return {
            "task_id": task_id,
            "passed": False,
            "reasons": [f"agent execution failed: {result.get('error')}"],
        }

    answer = result.get("answer", "")

    for text in task.get("expected", {}).get("must_include", []):
        if text not in answer:
            reasons.append(f"missing required text: {text}")

    max_words = task.get("constraints", {}).get("max_words")
    if max_words is not None and len(answer) > max_words:
        reasons.append(f"output exceeds max_words: {max_words}")

    return {
        "task_id": task_id,
        "passed": len(reasons) == 0,
        "reasons": reasons,
    }
```

### 步骤 7：添加 Evaluator 测试

创建文件：

```text
agent-harness-demo/tests/test_evaluator.py
```

写入测试：

```python
from src.evaluator import evaluate


def test_evaluate_passes_when_rules_match():
    task = {
        "id": "task-001",
        "expected": {"must_include": ["评估", "结论"]},
        "constraints": {"max_words": 120},
    }
    result = {
        "status": "success",
        "answer": "评估可以让输出可验证，结论是它能提升稳定性。",
    }

    evaluation = evaluate(task, result)

    assert evaluation["passed"] is True
    assert evaluation["reasons"] == []


def test_evaluate_fails_when_required_text_missing():
    task = {
        "id": "task-001",
        "expected": {"must_include": ["结论"]},
        "constraints": {"max_words": 120},
    }
    result = {
        "status": "success",
        "answer": "评估可以让输出可验证。",
    }

    evaluation = evaluate(task, result)

    assert evaluation["passed"] is False
    assert evaluation["reasons"] == ["missing required text: 结论"]


def test_evaluate_fails_when_agent_errors():
    task = {
        "id": "task-001",
        "expected": {"must_include": ["结论"]},
        "constraints": {"max_words": 120},
    }
    result = {
        "status": "error",
        "answer": "",
        "error": "tool failed",
    }

    evaluation = evaluate(task, result)

    assert evaluation["passed"] is False
    assert evaluation["reasons"] == ["agent execution failed: tool failed"]
```

运行本章测试：

```bash
cd harness-tutorial/agent-harness-demo
python -m pytest tests/test_evaluator.py
```

## 示例

通过结果：

```json
{
  "task_id": "task-001",
  "passed": true,
  "reasons": []
}
```

失败结果：

```json
{
  "task_id": "task-003",
  "passed": false,
  "reasons": [
    "missing required text: 工具调用"
  ]
}
```

执行错误结果：

```json
{
  "task_id": "task-002",
  "passed": false,
  "reasons": [
    "agent execution failed: tool text_search failed"
  ]
}
```

## 什么时候使用模型评估

模型评估适合判断更复杂的语义质量，例如逻辑是否完整、语气是否符合要求、答案是否忠实于资料。

入门阶段暂不建议直接使用模型评估，原因是：

- 评估成本更高
- 结果可能不稳定
- 初学者更难定位失败原因
- 容易掩盖任务定义不清的问题

先把规则评估做好，再扩展模型评估。

## 检查点

- [ ] 能说明 Evaluator 的职责
- [ ] 支持 `must_include`
- [ ] 支持 `max_words`
- [ ] 执行错误会导致评估失败
- [ ] 失败结果包含可读原因
- [ ] 能说明规则评估和模型评估的区别
- [ ] `tests/test_evaluator.py` 可以通过
