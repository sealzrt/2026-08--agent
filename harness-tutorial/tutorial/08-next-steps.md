# 第 8 章：后续扩展方向

## 学习目标

完成本章后，你应该能够：

- 识别第一版 Harness 的边界
- 判断哪些能力适合后续扩展
- 理解扩展能力应如何进入 Task、Trace、Evaluate 或 Report
- 避免一开始把 Harness 做成过重平台

## 第一版边界回顾

第一版只覆盖最小闭环：

```text
Task -> Agent -> Trace -> Evaluate -> Report
```

它解决的是入门阶段最重要的问题：

- 任务可复现
- 过程可观测
- 输出可评估
- 结果可汇总

它暂不解决：

- 多模型调度
- Prompt 版本库
- 可视化 Trace
- 多 Agent 协作
- 生产级监控
- 权限和团队协作

## Python 主入口串联

在完成前 7 章后，可以用 `src/main.py` 把各模块串起来。这个入口只做编排，不放复杂业务逻辑。

建议主流程：

```python
import argparse
import json
import time
from pathlib import Path

from src.agent_runner import run_task
from src.evaluator import evaluate
from src.report_writer import write_report
from src.task_loader import load_tasks
from src.trace_logger import now_iso, write_trace


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tasks", required=True)
    args = parser.parse_args()

    tasks = load_tasks(args.tasks)
    records = []

    for task in tasks:
        start_time = now_iso()
        start_monotonic = time.monotonic()
        result = run_task(task)
        trace_path = write_trace(
            trace_dir="traces",
            task=task,
            result=result,
            model="mock-agent",
            start_time=start_time,
            start_monotonic=start_monotonic,
        )
        evaluation = evaluate(task, result)
        trace = json.loads(Path(trace_path).read_text(encoding="utf-8"))

        records.append(
            {
                "task": task,
                "result": result,
                "evaluation": evaluation,
                "trace": trace,
                "trace_path": str(trace_path),
            }
        )

    report_path = write_report("reports/sample-report.md", records)
    print(f"report written to {report_path}")


if __name__ == "__main__":
    main()
```

运行命令：

```bash
cd harness-tutorial/agent-harness-demo
python -m src.main --tasks tasks/beginner.yaml
```

## 扩展原则

后续扩展应遵守四个原则：

- 每次只增加一个独立能力
- 每个能力必须配套任务用例
- 每个能力必须进入 Trace 或 Report
- 每个能力必须有明确验收标准

如果一个能力不能被任务驱动、不能被记录、不能被评估，就不应该急着加入第一版 Harness。

## 扩展方向一：Prompt A/B 测试

目标：

- 对比两个 Prompt 版本在同一任务集上的表现

需要新增：

- `prompt_version`
- 多组运行结果
- 按版本汇总的通过率

Trace 中应增加：

```json
{
  "prompt_version": "prompt-v1"
}
```

Report 中应增加：

```text
prompt-v1 pass_rate: 66.67%
prompt-v2 pass_rate: 83.33%
```

## 扩展方向二：多模型对比

目标：

- 对比不同模型在同一任务集上的质量、耗时和成本

需要新增：

- 模型配置
- 模型名称
- 成本统计
- 按模型维度汇总报告

Trace 中已有 `model` 字段，后续可以扩展：

```json
{
  "model": "model-a",
  "input_tokens": 500,
  "output_tokens": 120,
  "estimated_cost": 0.01
}
```

## 扩展方向三：失败用例分类

目标：

- 发现 Agent 失败集中在哪些类型

失败类型可以包括：

- 缺少必需信息
- 超出长度限制
- 工具调用失败
- 输出格式错误
- 回答不忠实于资料

Report 可以增加：

```text
失败类型统计：
- missing_required_text: 3
- tool_error: 1
- output_too_long: 2
```

## 扩展方向四：Trace 可视化

目标：

- 让开发者更直观看到 Agent 运行过程

可视化内容可以包括：

- 任务输入
- 模型输出
- 工具调用时间线
- 错误位置
- 耗时分布

第一版不做可视化页面，因为 JSON Trace 和 Markdown Report 已经能支撑入门学习。

## 扩展方向五：人工评审表单

目标：

- 支持规则评估无法覆盖的质量判断

人工评审可以记录：

- 是否事实正确
- 是否结构清晰
- 是否语气合适
- 是否满足业务目标

建议先把人工评审结果写入 Report，再考虑做表单页面。

## 扩展方向六：CI 回归验证

目标：

- 每次修改 Prompt 或 Agent 逻辑后自动运行任务集

CI 可以执行：

```bash
python -m pytest
python -m src.main --tasks tasks/beginner.yaml
```

验收方式：

- 单元测试通过
- Demo 运行成功
- 通过率不低于设定阈值
- Report 作为构建产物保存

## 推荐迭代顺序

建议按以下顺序扩展：

1. Prompt A/B 测试
2. 多模型对比
3. 成本统计
4. 失败用例分类
5. Trace 可视化页面
6. 人工评审表单
7. CI 回归验证

这个顺序先强化评估能力，再强化观测和协作能力。

## 检查点

- [ ] 能说明第一版 Harness 的边界
- [ ] 能说出至少 3 个后续扩展方向
- [ ] 能判断扩展能力应该进入 Trace 还是 Report
- [ ] 能说明为什么第一版不做可视化页面
- [ ] 能说明为什么扩展能力必须有验收标准
- [ ] 能说明 `src/main.py` 只负责串联流程
