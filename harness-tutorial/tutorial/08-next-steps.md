# 第 8 章：后续扩展方向

> **一句话概括**：最小闭环已经跑通了。这一章聊聊未来可以往哪个方向「加零件」，以及为什么不能一开始就把 Harness 做成一个大平台。

---

## 通俗理解

前 7 章我们做了一套完整的「考试系统」：

```
Task（试卷）→ Agent（考生）→ Trace（录像）→ Evaluate（批卷）→ Report（成绩单）
```

这套系统已经能用了。但它就像一辆能开的最小原型车——没有空调、没有导航、没有倒车雷达。

本章就是告诉你：未来可以加哪些「配置」，以及应该按什么顺序加。关键原则是：**每次只加一个配置，加了就要能用、能测、能看到效果。**

---

## 学习目标

完成本章后，你应该能够：

- 识别第一版 Harness 的边界
- 判断哪些能力适合后续扩展
- 理解扩展能力应如何进入 Task、Trace、Evaluate 或 Report
- 避免一开始把 Harness 做成过重平台

## 第一版边界回顾

> **类比**：最小闭环就像一台能打电话的功能机。它不能拍照、不能上网、不能装 App——但它能打电话。这就够了。以后可以加摄像头（Trace 可视化）、加应用商店（多模型对比）、加 GPS（CI 回归）。但不是现在。

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

> **类比**：就像装修房子——先做好水电（基础闭环），再装地板、刷墙、买家具。如果你先买家具再装水电，就得把家具搬来搬去。扩展 Harness 也一样，先打好地基再加盖楼层。

后续扩展应遵守四个原则：

- 每次只增加一个独立能力
- 每个能力必须配套任务用例
- 每个能力必须进入 Trace 或 Report
- 每个能力必须有明确验收标准

如果一个能力不能被任务驱动、不能被记录、不能被评估，就不应该急着加入第一版 Harness。

## 扩展方向一：Prompt A/B 测试

> **类比**：就像用两套不同的教学方法教同一个班，然后看哪个班的考试成绩更好。

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

> **类比**：就像让不同的实习生做同一份试卷，比较他们的成绩、速度和成本。

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

> **类比**：就像老师把学生的错题按类型分类——计算错误、概念错误、审题错误——然后针对性辅导。

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

> **类比**：就像游戏升级——先加最影响体验的装备，再慢慢加装饰和社交功能。

建议按以下顺序扩展：

1. Prompt A/B 测试
2. 多模型对比
3. 成本统计
4. 失败用例分类
5. Trace 可视化页面
6. 人工评审表单
7. CI 回归验证

这个顺序先强化评估能力，再强化观测和协作能力。

## 教程总结

恭喜你完成了 Harness 入门教程的全部 8 章！

回顾一下你学到的东西：

| 章节 | 你做了什么 | 类比 |
|------|---------|------|
| 01 | 理解了为什么需要 Harness | 实习生需要办公环境 |
| 02 | 定义了标准化任务 | 标准化考试卷 |
| 03 | 实现了 Agent Runner | 认真答题的考生 |
| 04 | 接入了工具注册表 | 考生的工具箱 |
| 05 | 记录了 Trace | 考场监控录像 |
| 06 | 设计了 Evaluator | 拿着标准的阅卷老师 |
| 07 | 生成了 Report | 考试成绩单 |
| 08 | 了解了扩展方向 | 升级装备顺序 |

核心记住一句话：**Harness 的价值不是让 Agent 变聪明，而是让 Agent 的工作变得可观察、可评估、可复现。**

## 检查点

- [ ] 能用「装修房子」的类比解释扩展原则

- [ ] 能说明第一版 Harness 的边界
- [ ] 能说出至少 3 个后续扩展方向
- [ ] 能判断扩展能力应该进入 Trace 还是 Report
- [ ] 能说明为什么第一版不做可视化页面
- [ ] 能说明为什么扩展能力必须有验收标准
- [ ] 能说明 `src/main.py` 只负责串联流程
