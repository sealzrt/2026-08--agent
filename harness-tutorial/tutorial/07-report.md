# 第 7 章：生成运行报告

> **一句话概括**：Report 就是考试的「成绩单」——把所有任务的成绩汇总到一页，通过率一目了然，失败的任务附带失败原因和监控录像链接。

---

## 通俗理解

前几章我们有了试卷、考生、工具箱、监控录像和阅卷老师。每份材料都很有用，但散落各处。

Report 就是把所有材料汇总成一份「成绩单」：

| 成绩单内容 | Report 中的对应 |
|---------|----------------|
| 总分/平均分 | 通过率、平均耗时 |
| 每道题的得分 | 每个任务的 pass/fail |
| 错题分析 | 失败任务的 reasons |
| 考场录像索引 | Trace 文件路径 |

有了成绩单，你不用翻每份单独的试卷，一眼就能看到整体表现和具体问题。

---

## 学习目标

完成本章后，你应该能够：

- 说明 Report 在 Harness 中的作用
- 汇总任务运行结果
- 展示通过率和失败原因
- 在报告中关联 Trace 文件路径
- 生成可读的 Markdown 报告

## 核心概念

### Report

Report 是 Harness 的最终可读产物。它把多个任务的执行结果、评估结果和 Trace 路径汇总起来，让开发者快速判断当前 Agent 表现。

### 通过率

通过率用于快速观察整体效果。

```text
通过率 = 通过任务数 / 总任务数
```

### 失败详情

失败详情用于定位具体问题。它至少应该包含任务编号、失败原因和 Trace 路径。

## 报告内容设计

第一版 Markdown Report 建议包含：

- 总任务数
- 通过数
- 失败数
- 通过率
- 平均耗时
- 失败任务详情
- Trace 文件路径

## 操作步骤

本章对应文件：

```text
agent-harness-demo/src/report_writer.py
agent-harness-demo/tests/test_report_writer.py
agent-harness-demo/reports/sample-report.md
```

### 步骤 1：收集运行结果

Report Writer 需要接收每个任务的结果：

- Task 信息
- Agent Runner 结果
- Evaluator 结果
- Trace 文件路径

### 步骤 2：计算汇总指标

需要计算：

- `total_tasks`
- `passed_tasks`
- `failed_tasks`
- `pass_rate`
- `average_duration_ms`

### 步骤 3：整理失败详情

失败详情建议包含：

- `task_id`
- `task_name`
- `reasons`
- `trace_path`

### 步骤 4：写入 Markdown 文件

报告建议输出到：

```text
agent-harness-demo/reports/sample-report.md
```

实际运行时可以按时间戳生成：

```text
reports/report-20260810-200000.md
```

### 步骤 5：实现 Python Report Writer

创建文件：

```text
agent-harness-demo/src/report_writer.py
```

写入代码：

```python
from pathlib import Path
from typing import Any


def write_report(report_path: str | Path, records: list[dict[str, Any]]) -> Path:
    output_path = Path(report_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    total = len(records)
    passed = sum(1 for record in records if record["evaluation"]["passed"])
    failed = total - passed
    pass_rate = (passed / total * 100) if total else 0
    average_duration = average_duration_ms(records)

    lines = [
        "# Harness 运行报告",
        "",
        "## 汇总",
        "",
        "| 指标 | 值 |",
        "| --- | --- |",
        f"| 总任务数 | {total} |",
        f"| 通过数 | {passed} |",
        f"| 失败数 | {failed} |",
        f"| 通过率 | {pass_rate:.2f}% |",
        f"| 平均耗时 | {average_duration} ms |",
        "",
        "## 失败详情",
        "",
    ]

    failed_records = [record for record in records if not record["evaluation"]["passed"]]
    if not failed_records:
        lines.append("无失败任务。")
        lines.append("")
    else:
        for record in failed_records:
            task = record["task"]
            reasons = "；".join(record["evaluation"]["reasons"])
            lines.extend(
                [
                    f"### {task['id']} {task['name']}",
                    "",
                    f"- 失败原因：{reasons}",
                    f"- Trace：{record['trace_path']}",
                    "",
                ]
            )

    lines.extend(
        [
            "## 全部任务",
            "",
            "| 任务 | 状态 | 耗时 | Trace |",
            "| --- | --- | --- | --- |",
        ]
    )

    for record in records:
        task = record["task"]
        status = "pass" if record["evaluation"]["passed"] else "fail"
        duration = record["trace"]["duration_ms"]
        lines.append(f"| {task['id']} | {status} | {duration} ms | {record['trace_path']} |")

    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return output_path


def average_duration_ms(records: list[dict[str, Any]]) -> int:
    if not records:
        return 0

    total_duration = sum(record["trace"]["duration_ms"] for record in records)
    return int(total_duration / len(records))
```

### 步骤 6：添加 Report Writer 测试

创建文件：

```text
agent-harness-demo/tests/test_report_writer.py
```

写入测试：

```python
from pathlib import Path

from src.report_writer import write_report


def test_write_report_creates_markdown_summary(tmp_path: Path):
    report_path = tmp_path / "report.md"
    records = [
        {
            "task": {"id": "task-001", "name": "summarize"},
            "evaluation": {"passed": True, "reasons": []},
            "trace": {"duration_ms": 100},
            "trace_path": "traces/run-task-001.json",
        },
        {
            "task": {"id": "task-002", "name": "extract"},
            "evaluation": {"passed": False, "reasons": ["missing required text: Report"]},
            "trace": {"duration_ms": 200},
            "trace_path": "traces/run-task-002.json",
        },
    ]

    output = write_report(report_path, records)

    text = output.read_text(encoding="utf-8")
    assert "| 总任务数 | 2 |" in text
    assert "| 通过数 | 1 |" in text
    assert "missing required text: Report" in text
    assert "traces/run-task-002.json" in text
```

运行本章测试：

```bash
cd harness-tutorial/agent-harness-demo
python -m pytest tests/test_report_writer.py
```

## 示例报告

```markdown
# Harness 运行报告

## 汇总

| 指标 | 值 |
| --- | --- |
| 总任务数 | 3 |
| 通过数 | 2 |
| 失败数 | 1 |
| 通过率 | 66.67% |
| 平均耗时 | 950 ms |

## 失败详情

### task-003 explain_trace_value

- 失败原因：missing required text: 工具调用
- Trace：traces/run-20260810-200010-task-003.json

## 全部任务

| 任务 | 状态 | 耗时 | Trace |
| --- | --- | --- | --- |
| task-001 | pass | 800 ms | traces/run-20260810-200001-task-001.json |
| task-002 | pass | 900 ms | traces/run-20260810-200005-task-002.json |
| task-003 | fail | 1150 ms | traces/run-20260810-200010-task-003.json |
```

## 报告如何帮助迭代

> **类比**：这就像考试后的「错题本」——每次模拟考后看看哪些题型总是错，就知道该重点练什么。Report 的失败详情就是你的“错题本”。

有了报告后，修改 Prompt 或工具逻辑时，可以重新运行同一批任务并比较：

- 通过率是否提升
- 失败任务是否减少
- 平均耗时是否增加
- 失败原因是否集中在同一类规则
- Trace 是否显示工具调用异常

这就是 Harness 帮助 Agent 开发回归验证的核心价值。

## 常见问题

### 只展示通过率够吗

> **类比**：就像老师只告诉你“你班平均分 75”，但不告诉你哪道题错的人最多——你根本不知道该重点复习什么。

不够。通过率只能说明整体表现，不能告诉你失败原因。报告必须包含失败详情。

### 是否需要展示所有 Trace 内容

第一版不需要。报告中保留 Trace 文件路径即可，避免报告过长。

### 是否需要生成 HTML 报告

第一版不需要。Markdown 更容易生成、阅读和纳入版本管理。

## 小结与下一章

本章你做了一份「成绩单」——Report，把所有任务的执行结果、评估结果和 Trace 路径汇总成一份可读的 Markdown 报告。

**恭喜！最小 Harness 闭环已经完成：**

```
Task（试卷）→ Agent（考生）→ Trace（录像）→ Evaluate（批卷）→ Report（成绩单）
```

下一章我们把所有模块串起来，并看看未来可以向哪些方向扩展。

## 检查点

- [ ] 能用「成绩单」的类比解释 Report

- [ ] Report 展示总任务数
- [ ] Report 展示通过数和失败数
- [ ] Report 展示通过率
- [ ] Report 展示失败原因
- [ ] Report 关联 Trace 文件路径
- [ ] 能说明 Report 如何支持回归验证
- [ ] `tests/test_report_writer.py` 可以通过
