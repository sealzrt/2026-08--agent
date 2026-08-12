# 第 2 章：定义第一个任务用例

## 学习目标

完成本章后，你应该能够：

- 说明 Task 在 Harness 中的作用
- 用 YAML 定义一个任务用例
- 为任务添加输入、期望结果和约束条件
- 编写 3 到 5 个可回归运行的基础任务

## 核心概念

### Task

Task 是 Harness 交给 Agent 的任务描述。它不是一句随手输入的问题，而是可重复运行、可评估、可归档的数据。

### Expected

`expected` 描述任务结果应该满足什么条件。入门阶段建议先使用简单、稳定的规则，例如必须包含某些关键词。

### Constraints

`constraints` 描述输出限制，例如最大字数、输出格式、是否允许调用工具。

## 任务字段设计

第一版任务结构建议包含以下字段：

```yaml
id: task-001
name: summarize_short_text
input: "请总结下面这段关于 Agent 评估流程的文本，并提炼核心观点。"
expected:
  must_include:
    - "核心观点"
    - "结论"
constraints:
  max_words: 120
```

字段说明：

- `id`：任务唯一标识，用于 Trace 和 Report 关联
- `name`：任务名称，方便人阅读
- `input`：交给 Agent 的输入
- `expected.must_include`：输出必须包含的内容
- `constraints.max_words`：输出最大字数

## 操作步骤

本章对应文件：

```text
agent-harness-demo/tasks/beginner.yaml
agent-harness-demo/src/task_loader.py
agent-harness-demo/tests/test_task_loader.py
```

### 步骤 1：创建任务目录

在示例项目中创建任务目录：

```bash
mkdir -p agent-harness-demo/tasks
```

### 步骤 2：创建任务文件

创建文件：

```text
agent-harness-demo/tasks/beginner.yaml
```

### 步骤 3：写入 3 个基础任务

建议从 3 个任务开始：

```yaml
tasks:
  - id: task-001
    name: summarize_agent_evaluation
    input: "请用不超过 120 字解释为什么 Agent 开发需要评估流程，并给出结论。"
    expected:
      must_include:
        - "评估"
        - "结论"
    constraints:
      max_words: 120

  - id: task-002
    name: extract_harness_keywords
    input: "请从 Harness、Trace、Evaluator、Report 这几个概念中提取 3 个关键词。"
    expected:
      must_include:
        - "Trace"
        - "Evaluator"
        - "Report"
    constraints:
      max_words: 80

  - id: task-003
    name: explain_trace_value
    input: "请说明 Trace 为什么能帮助定位 Agent 失败原因。"
    expected:
      must_include:
        - "工具调用"
        - "错误"
    constraints:
      max_words: 100
```

### 步骤 4：检查任务是否可评估

逐个检查任务：

- 是否有唯一 `id`
- 是否有明确 `input`
- 是否有可自动判断的 `expected`
- 是否有明确 `constraints`
- 是否避免了模糊要求

### 步骤 5：实现 Python 任务加载器

创建文件：

```text
agent-harness-demo/src/task_loader.py
```

写入代码：

```python
from pathlib import Path
from typing import Any

import yaml


REQUIRED_FIELDS = {"id", "name", "input", "expected", "constraints"}


def load_tasks(path: str | Path) -> list[dict[str, Any]]:
    task_path = Path(path)
    data = yaml.safe_load(task_path.read_text(encoding="utf-8"))

    if not isinstance(data, dict) or "tasks" not in data:
        raise ValueError("task file must contain a top-level 'tasks' list")

    tasks = data["tasks"]
    if not isinstance(tasks, list):
        raise ValueError("'tasks' must be a list")

    for index, task in enumerate(tasks):
        if not isinstance(task, dict):
            raise ValueError(f"task at index {index} must be an object")

        missing = REQUIRED_FIELDS - set(task)
        if missing:
            raise ValueError(f"task {task.get('id', index)} missing fields: {sorted(missing)}")

    return tasks
```

### 步骤 6：添加任务加载测试

创建文件：

```text
agent-harness-demo/tests/test_task_loader.py
```

写入测试：

```python
from pathlib import Path

import pytest

from src.task_loader import load_tasks


def test_load_tasks_reads_valid_yaml(tmp_path: Path):
    task_file = tmp_path / "tasks.yaml"
    task_file.write_text(
        """
tasks:
  - id: task-001
    name: summarize
    input: "请总结文本。"
    expected:
      must_include:
        - "总结"
    constraints:
      max_words: 120
""",
        encoding="utf-8",
    )

    tasks = load_tasks(task_file)

    assert len(tasks) == 1
    assert tasks[0]["id"] == "task-001"


def test_load_tasks_rejects_missing_fields(tmp_path: Path):
    task_file = tmp_path / "tasks.yaml"
    task_file.write_text(
        """
tasks:
  - id: task-001
    name: summarize
""",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="missing fields"):
        load_tasks(task_file)
```

运行本章测试：

```bash
cd harness-tutorial/agent-harness-demo
python -m pytest tests/test_task_loader.py
```

## 示例

一个不适合第一版 Harness 的任务：

```yaml
id: task-bad-001
name: write_good_answer
input: "请写一个好的回答。"
expected:
  quality: "good"
constraints:
  style: "better"
```

问题：

- `good` 无法稳定判断
- `better` 没有比较对象
- Evaluator 很难给出明确失败原因

改成可评估任务：

```yaml
id: task-004
name: explain_evaluator
input: "请用不超过 100 字解释 Evaluator 的作用，并包含'规则'和'失败原因'两个词。"
expected:
  must_include:
    - "规则"
    - "失败原因"
constraints:
  max_words: 100
```

## 检查点

- [ ] 已创建 `tasks/beginner.yaml`
- [ ] 至少定义 3 个任务
- [ ] 每个任务都有 `id`、`name`、`input`、`expected`、`constraints`
- [ ] 每个任务都有可自动判断的验收条件
- [ ] 能说明为什么模糊任务不适合入门 Harness
- [ ] `load_tasks()` 能读取合法 YAML
- [ ] `load_tasks()` 能拒绝缺少必填字段的任务
