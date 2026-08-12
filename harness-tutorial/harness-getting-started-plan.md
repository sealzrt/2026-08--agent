# Harness 入门教程方案

## 1. 文档目标

本文档用于规划一套面向初学者的 AI/Agent Harness 入门教程，帮助学习者理解 Harness 的作用、核心组成、搭建方式和验证方法，并通过一个最小可运行示例掌握基本工作流。

这里的 Harness 指用于驱动、观测、测试和评估 AI Agent 的外部运行框架，而不是 CI/CD 平台。

## 2. 目标读者

- 刚开始接触 AI Agent 开发的工程师
- 希望系统理解 Agent 测试与评估流程的开发者
- 想把 Prompt、工具调用、评估用例和运行日志组织起来的团队成员

## 3. 学习目标

完成教程后，学习者应能够：

- 解释 Harness 在 AI/Agent 开发中的定位
- 区分 Agent、Prompt、Tool、Task、Evaluator、Trace 等核心概念
- 搭建一个最小可运行 Harness
- 编写基础任务用例并运行 Agent
- 记录运行结果、工具调用和错误信息
- 为 Agent 输出设计简单评估标准
- 识别 Harness 后续可扩展的方向

## 4. 核心概念

### 4.1 Agent

Agent 是执行任务的主体，通常由模型、系统提示词、工具列表、上下文管理和决策逻辑组成。

### 4.2 Harness

Harness 是围绕 Agent 的运行外壳，负责准备输入、调用 Agent、捕获过程、收集输出、运行评估，并生成可复现的结果。

### 4.3 Task

Task 是 Harness 要交给 Agent 完成的任务描述。一个 Task 通常包含输入、预期目标、约束条件和评估方式。

### 4.4 Tool

Tool 是 Agent 可以调用的外部能力，例如文件读取、搜索、数据库查询、API 调用、代码执行等。

### 4.5 Trace

Trace 是一次运行过程的结构化记录，包括输入、模型响应、工具调用、错误、耗时、token 消耗和最终输出。

### 4.6 Evaluator

Evaluator 用于判断 Agent 输出是否满足要求。它可以是规则判断、断言、人工评分，也可以是另一个模型评估器。

## 5. 最小 Harness 架构

入门教程建议使用一个最小架构：

```text
用户任务
  |
  v
Task Loader
  |
  v
Agent Runner ----> Tool Registry
  |
  v
Trace Logger
  |
  v
Evaluator
  |
  v
Report
```

各模块职责如下：

- `Task Loader`：读取任务用例
- `Agent Runner`：执行 Agent 主流程
- `Tool Registry`：管理可用工具
- `Trace Logger`：记录执行过程
- `Evaluator`：评估执行结果
- `Report`：输出运行报告

## 6. 教程章节设计

### 第 1 章：为什么需要 Harness

内容重点：

- 手动测试 Agent 的问题
- Prompt 改动难以回归验证的问题
- 工具调用过程不可观测的问题
- Harness 如何提升可复现性和评估效率

实践任务：

- 给出一个简单问答 Agent
- 手动运行 3 个任务
- 观察手动验证的低效和不稳定

### 第 2 章：定义第一个任务用例

内容重点：

- Task 的基本字段设计
- 输入、约束、期望结果的表达方式
- 用 JSON 或 YAML 管理任务集合

示例结构：

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

实践任务：

- 编写 3 个基础任务
- 为每个任务增加明确的验收条件

### 第 3 章：实现 Agent Runner

内容重点：

- 如何接收 Task
- 如何构造 Prompt
- 如何调用模型
- 如何返回结构化结果

实践任务：

- 实现一个最小 `run_task(task)` 方法
- 输出 `task_id`、`status`、`answer`、`error`

### 第 4 章：接入工具调用

内容重点：

- Tool Registry 的作用
- 工具输入输出协议
- 工具失败时的错误记录

实践任务：

- 创建一个 `calculator` 工具
- 创建一个 `text_search` 工具
- 让 Agent 在任务中选择是否使用工具

### 第 5 章：记录 Trace

内容重点：

- 为什么只看最终答案不够
- Trace 中应记录哪些字段
- 如何用 Trace 定位 Agent 失败原因

建议记录字段：

- `run_id`
- `task_id`
- `start_time`
- `end_time`
- `model`
- `input`
- `tool_calls`
- `final_output`
- `error`
- `duration_ms`

实践任务：

- 为每次运行生成 Trace 文件
- 对比成功任务和失败任务的 Trace

### 第 6 章：设计 Evaluator

内容重点：

- 规则评估
- 关键词评估
- 格式评估
- 人工评估入口
- 模型评估的适用边界

实践任务：

- 实现 `must_include` 检查
- 实现 `max_words` 检查
- 输出 `pass`、`fail`、`reason`

### 第 7 章：生成运行报告

内容重点：

- 汇总通过率
- 展示失败用例
- 展示错误原因
- 给出可读的 Markdown 报告

报告建议包含：

- 总任务数
- 通过数
- 失败数
- 平均耗时
- 失败详情
- Trace 文件路径

### 第 8 章：扩展方向

内容重点：

- 多模型对比
- Prompt 版本管理
- 数据集管理
- 自动回归测试
- 复杂工具链编排
- 可视化 Trace
- 人工标注闭环

## 7. 最小实践项目结构

建议教程最终配套如下目录：

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

## 8. 推荐技术选型

入门阶段优先选择简单、可读、依赖少的方案：

- 语言：Python 3.11+
- 任务格式：YAML
- 输出报告：Markdown
- Trace 格式：JSON
- 测试框架：pytest
- 依赖管理：requirements.txt
- 第一版依赖：PyYAML、pytest
- 评估方式：先使用规则评估，再扩展模型评估

## 9. 教程交付物

教程完成后应产出：

- 一份入门教程文档
- 一个最小可运行 Harness 示例
- 3 到 5 个任务用例
- 一套基础评估规则
- 一份运行报告示例
- 一份扩展练习清单

## 10. 验收标准

教程是否完成，可按以下标准检查：

- 学习者能说明 Harness 和 Agent 的区别
- 学习者能独立添加一个新 Task
- Harness 能批量运行多个 Task
- 每次运行都有 Trace 记录
- Evaluator 能给出通过或失败结果
- Report 能展示整体通过率和失败原因
- 示例项目不依赖复杂基础设施即可运行

## 11. 常见误区

- 只关注最终答案，不记录运行过程
- 一开始就引入过重的平台或复杂框架
- 没有固定任务集，导致 Prompt 改动无法回归
- Evaluator 标准过于模糊，无法稳定判断好坏
- 工具调用失败后没有记录输入、输出和错误信息

## 12. 后续迭代建议

第一版教程只覆盖最小闭环：

```text
Task -> Agent -> Trace -> Evaluate -> Report
```

第二版可增加：

- Prompt A/B 测试
- 多模型对比
- 成本统计
- 失败用例自动归类
- Trace 可视化页面
- 人工评审表单

第三版可增加：

- 团队协作流程
- CI 集成
- 长任务拆解
- 多 Agent 协作评估
- 生产环境观测指标

## 13. 建议学习路径

建议按照以下顺序学习：

1. 先理解 Harness 的目的
2. 再定义稳定的任务用例
3. 然后实现最小 Agent Runner
4. 接着加入 Trace
5. 再加入 Evaluator
6. 最后生成 Report

这样可以避免一开始陷入复杂框架，优先建立可复现、可观察、可评估的 Agent 开发习惯。
