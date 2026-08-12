# 第 5 章：记录 Trace

> **一句话概括**：Trace 就是考试现场的「监控录像」——不只记录最终答案，还记录整个答题过程，失败了可以回放找原因。

---

## 通俗理解

前面的章节中，我们知道考生答题后要返回结构化结果。但如果只看最终答案，就像只看考试分数——你不知道学生是怎么做的、哪一步出了问题。

Trace 的作用就像考场监控录像：

| 监控录像记录 | Trace 记录 |
|------------|------------|
| 几点开考 | `start_time` |
| 几点交卷 | `end_time` |
| 考的是哪份卷子 | `task_id` |
| 谁在答题 | `model` |
| 用了什么工具（计算器、字典） | `tool_calls` |
| 最终答案写了什么 | `final_output` |
| 出了什么意外 | `error` |
| 答了多久 | `duration_ms` |

有了这份“录像”，任务失败时不用再猜，直接回放就能找到原因。

---

## 学习目标

完成本章后，你应该能够：

- 说明为什么只看最终答案不够
- 设计一次 Agent 运行的 Trace 字段
- 理解 Trace 如何帮助定位失败原因
- 用 JSON 保存结构化运行记录

## 核心概念

### Trace

Trace 是一次任务运行过程的结构化记录。它记录 Agent 收到了什么输入、调用了哪些工具、产生了什么输出、是否出错，以及运行用了多长时间。

### run_id

`run_id` 是一次运行的唯一标识。即使同一个任务运行多次，也应该生成不同的 `run_id`。

### task_id

`task_id` 来自任务文件，用于把 Trace 和任务用例关联起来。

## Trace 字段设计

> **类比**：Trace 就像快递单——不只是“寄到”和“寄不到”，而是记录每个节点：揽收、中转、派送，这样包裹丢了就知道在哪一步出的问题。

第一版建议记录以下字段：

```json
{
  "run_id": "run-20260810-001",
  "task_id": "task-001",
  "start_time": "2026-08-10T20:00:00+08:00",
  "end_time": "2026-08-10T20:00:01+08:00",
  "model": "mock-agent",
  "input": "请用不超过 120 字解释为什么 Agent 开发需要评估流程，并给出结论。",
  "tool_calls": [],
  "final_output": "Agent 开发需要评估流程来稳定判断输出质量。结论是评估能提升可复现性。",
  "error": null,
  "duration_ms": 1000
}
```

字段说明：

- `run_id`：本次运行唯一标识
- `task_id`：对应任务编号
- `start_time`：开始时间
- `end_time`：结束时间
- `model`：执行任务的模型或模拟 Agent 名称
- `input`：任务输入
- `tool_calls`：工具调用记录
- `final_output`：最终输出
- `error`：执行错误
- `duration_ms`：耗时

## 操作步骤

本章对应文件：

```text
agent-harness-demo/src/trace_logger.py
agent-harness-demo/tests/test_trace_logger.py
```

### 步骤 1：创建 Trace 目录

建议将 Trace 文件放在：

```text
agent-harness-demo/traces/
```

### 步骤 2：生成 run_id

`run_id` 可以使用时间戳和随机片段生成。

示例：

```text
run-20260810-200001-task-001
```

### 步骤 3：在任务运行前记录开始时间

运行任务前记录：

- `run_id`
- `task_id`
- `start_time`
- `input`
- `model`

### 步骤 4：在任务运行后记录结束状态

运行任务后记录：

- `end_time`
- `tool_calls`
- `final_output`
- `error`
- `duration_ms`

### 步骤 5：写入 JSON 文件

建议一个任务运行生成一个 Trace 文件：

```text
traces/run-20260810-200001-task-001.json
```

这样失败时可以直接根据 Report 中的路径找到完整过程。

### 步骤 6：实现 Python Trace Logger

创建文件：

```text
agent-harness-demo/src/trace_logger.py
```

写入代码：

```python
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def build_run_id(task_id: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    return f"run-{timestamp}-{task_id}"


def write_trace(
    trace_dir: str | Path,
    task: dict[str, Any],
    result: dict[str, Any],
    model: str,
    start_time: str,
    start_monotonic: float,
) -> Path:
    trace_path = Path(trace_dir)
    trace_path.mkdir(parents=True, exist_ok=True)

    end_time = now_iso()
    duration_ms = int((time.monotonic() - start_monotonic) * 1000)
    run_id = build_run_id(task["id"])

    trace = {
        "run_id": run_id,
        "task_id": task["id"],
        "start_time": start_time,
        "end_time": end_time,
        "model": model,
        "input": task["input"],
        "tool_calls": result.get("tool_calls", []),
        "final_output": result.get("answer", ""),
        "error": result.get("error"),
        "duration_ms": duration_ms,
    }

    output_file = trace_path / f"{run_id}.json"
    output_file.write_text(
        json.dumps(trace, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return output_file
```

### 步骤 7：添加 Trace Logger 测试

创建文件：

```text
agent-harness-demo/tests/test_trace_logger.py
```

写入测试：

```python
import json
import time
from pathlib import Path

from src.trace_logger import now_iso, write_trace


def test_write_trace_creates_json_file(tmp_path: Path):
    task = {
        "id": "task-001",
        "input": "请总结文本。",
    }
    result = {
        "answer": "包含评估和结论。",
        "tool_calls": [],
        "error": None,
    }

    output_file = write_trace(
        trace_dir=tmp_path,
        task=task,
        result=result,
        model="mock-agent",
        start_time=now_iso(),
        start_monotonic=time.monotonic(),
    )

    data = json.loads(output_file.read_text(encoding="utf-8"))

    assert data["task_id"] == "task-001"
    assert data["model"] == "mock-agent"
    assert data["final_output"] == "包含评估和结论。"
    assert data["duration_ms"] >= 0
```

运行本章测试：

```bash
cd harness-tutorial/agent-harness-demo
python -m pytest tests/test_trace_logger.py
```

## 示例

成功 Trace：

```json
{
  "run_id": "run-20260810-200001-task-001",
  "task_id": "task-001",
  "start_time": "2026-08-10T20:00:01+08:00",
  "end_time": "2026-08-10T20:00:02+08:00",
  "model": "mock-agent",
  "input": "请用不超过 120 字解释为什么 Agent 开发需要评估流程，并给出结论。",
  "tool_calls": [],
  "final_output": "Agent 开发需要评估流程来稳定判断输出质量。结论是评估能提升可复现性。",
  "error": null,
  "duration_ms": 1000
}
```

失败 Trace：

```json
{
  "run_id": "run-20260810-200010-task-002",
  "task_id": "task-002",
  "start_time": "2026-08-10T20:00:10+08:00",
  "end_time": "2026-08-10T20:00:11+08:00",
  "model": "mock-agent",
  "input": "请从 Harness、Trace、Evaluator、Report 这几个概念中提取 3 个关键词。",
  "tool_calls": [
    {
      "name": "text_search",
      "input": {"text": "", "keyword": "Trace"},
      "output": null,
      "error": "text cannot be empty"
    }
  ],
  "final_output": "",
  "error": "tool text_search failed",
  "duration_ms": 1000
}
```

## 如何用 Trace 定位问题

> **类比**：就像医生看病不能只看体温，还要看化验单、CT 扫描。Trace 就是 Agent 的「化验单」，让你能看到内部发生了什么。

当任务失败时，按顺序检查：

1. `input` 是否符合预期
2. `tool_calls` 是否有错误
3. `final_output` 是否为空
4. `error` 是否指向执行异常
5. `duration_ms` 是否异常偏高

如果只看最终答案，这些线索都会丢失。

## 小结与下一章

本章你做了一台「监控录像」——Trace Logger，每次运行都会生成一份 JSON 格式的运行记录。

现在有试卷、考生、工具箱、录像了。但还没有人「批卷」。下一章我们来做「阅卷老师」——Evaluator。

## 检查点

- [ ] 能用「监控录像」或「快递单」的类比解释 Trace

- [ ] 能说明 Trace 的作用
- [ ] Trace 包含 `run_id`、`task_id`、`start_time`、`end_time`、`model`
- [ ] Trace 包含 `input`、`tool_calls`、`final_output`、`error`、`duration_ms`
- [ ] 每次任务运行都会生成 Trace
- [ ] 失败任务可以通过 Trace 找到原因
- [ ] `tests/test_trace_logger.py` 可以通过
