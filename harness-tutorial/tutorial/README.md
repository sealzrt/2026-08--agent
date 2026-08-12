# AI/Agent Harness 入门教程

> **一句话定位**：用「考试系统」的类比，带你从零理解 Harness 的每个模块。

## 教程定位

本教程面向刚开始接触 AI Agent 开发的学习者，目标是帮助你理解 Harness 的作用，并完成一个最小闭环：

```text
Task -> Agent -> Trace -> Evaluate -> Report
```

这里的 Harness 指用于驱动、观测、测试和评估 AI Agent 的外部运行框架。它不是 CI/CD 平台，也不是生产级 Agent 平台。

## 你将学到什么

完成本教程后，你不仅能理解这些概念，还能**用日常类比向别人解释清楚**：

- 说明 Harness 和 Agent 的区别（实习生 vs 办公环境）
- 定义稳定的任务用例（标准化考试卷）
- 理解 Agent Runner 的职责（认真答题的考生）
- 理解 Tool Registry 的作用（考生的工具箱）
- 设计 Trace 记录字段（考场监控录像）
- 编写基础 Evaluator 规则（拿着标准的阅卷老师）
- 生成可读的运行报告（考试成绩单）
- 判断后续扩展应该放在哪里（升级装备顺序）

## 推荐学习顺序

> 每章开头都有「一句话概括」和「通俗理解」部分，建议先看这些再进入技术细节。

1. [为什么需要 Harness](01-why-harness.md) 实习生需要办公环境
2. [定义第一个任务用例](02-task-definition.md) 标准化考试卷
3. [实现 Agent Runner](03-agent-runner.md) 认真答题的考生
4. [接入 Tool Registry](04-tool-registry.md) 考生的工具箱
5. [记录 Trace](05-trace-logger.md) 考场监控录像
6. [设计 Evaluator](06-evaluator.md) 拿着标准的阅卷老师
7. [生成运行报告](07-report.md) 考试成绩单
8. [后续扩展方向](08-next-steps.md) 升级装备顺序

## 第一版范围

第一版只覆盖最小可运行学习闭环：

- 用 YAML 管理任务
- 用 Python 组织 Demo 项目
- 用 JSON 记录 Trace
- 用规则评估输出
- 用 Markdown 汇总报告

第一版不覆盖：

- 生产级平台能力
- 多租户权限
- 可视化 Trace 页面
- 复杂多 Agent 编排
- CI/CD 平台级集成

## 建议项目结构

教程配套示例项目建议采用以下结构：

```text
agent-harness-demo/
  README.md
  requirements.txt
  tasks/
    beginner.yaml
  src/
    __init__.py
    task_loader.py
    agent_runner.py
    evaluator.py
    trace_logger.py
    tool_registry.py
    report_writer.py
    main.py
  tests/
    test_agent_runner.py
    test_evaluator.py
    test_report_writer.py
    test_trace_logger.py
    test_task_loader.py
    test_tool_registry.py
  traces/
    sample-trace.json
  reports/
    sample-report.md
```

## Python 环境准备

本教程统一使用 Python，第一版只需要两个依赖：

```text
PyYAML
pytest
```

建议在示例项目中创建 `requirements.txt`：

```text
PyYAML>=6.0
pytest>=8.0
```

初始化命令：

```bash
mkdir -p harness-tutorial/agent-harness-demo
cd harness-tutorial/agent-harness-demo
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 建议验证命令

当示例项目完成后，可以使用以下命令验证：

```bash
cd harness-tutorial/agent-harness-demo
python -m pytest
python -m src.main --tasks tasks/beginner.yaml
```

## 学习方式

每章都包含五个部分：

- 学习目标：说明本章完成后应掌握什么
- 核心概念：解释本章关键术语
- 操作步骤：说明具体要做什么
- 示例：给出结构化示例
- 检查点：用于判断是否完成本章

每章中的 Python 代码都是教学骨架，目标是帮助你理解模块边界和数据流。实际项目可以在此基础上增加真实模型调用、更多工具和更严格的评估规则。
