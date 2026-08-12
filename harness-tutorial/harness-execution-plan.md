# Harness 入门教程执行方案

## 1. 执行目标

基于《Harness 入门教程方案》，产出一套可交付、可演示、可复用的 AI/Agent Harness 入门教程材料。最终交付物应帮助初学者完成从概念理解到最小 Harness 实践的完整闭环。

本执行方案聚焦教程落地，不直接替代具体教程正文和示例代码。

## 2. 执行依据

来源文档：

- `harness-getting-started-plan.md`

核心闭环：

```text
Task -> Agent -> Trace -> Evaluate -> Report
```

核心模块：

- `Task Loader`
- `Agent Runner`
- `Tool Registry`
- `Trace Logger`
- `Evaluator`
- `Report`

## 3. 交付范围

本次执行覆盖以下内容：

- 入门教程正文
- 最小可运行 Harness 示例项目
- 任务用例集合
- 基础评估规则
- Trace 示例
- Markdown 运行报告示例
- 教程验收清单

本次执行不覆盖以下内容：

- 生产级 Agent 平台
- 多租户权限系统
- 可视化 Trace 前端页面
- 复杂多 Agent 编排
- CI/CD 平台级集成

## 4. 默认技术路线

为降低初学门槛，默认采用 Python 路线执行。

推荐原因：

- 脚本启动成本低
- 适合 AI 原型开发和教学演示
- 依赖较少，便于聚焦 Harness 核心概念

默认技术选型：

- 语言：Python 3.11+
- 任务格式：YAML
- Trace 格式：JSON
- 报告格式：Markdown
- 测试框架：pytest
- 依赖管理：requirements.txt，第一版只需要 `PyYAML` 和 `pytest`

## 5. 目标目录结构

建议最终形成如下目录：

```text
harness-tutorial/
  harness-getting-started-plan.md
  harness-execution-plan.md
  tutorial/
    README.md
    01-why-harness.md
    02-task-definition.md
    03-agent-runner.md
    04-tool-registry.md
    05-trace-logger.md
    06-evaluator.md
    07-report.md
    08-next-steps.md
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

## 6. 执行阶段

### 阶段 1：确认教程边界

目标：

- 固定教程面向初学者
- 固定最小闭环范围
- 固定默认技术路线为 Python

执行动作：

- 阅读 `harness-getting-started-plan.md`
- 提取核心概念、模块和章节结构
- 将不在第一版范围内的能力放入后续迭代

输出产物：

- 本执行方案
- 第一版范围说明

验收标准：

- 能清楚说明第一版做什么
- 能清楚说明第一版不做什么
- 不引入重型框架和平台级能力

### 阶段 2：编写教程正文骨架

目标：

- 建立完整教程目录
- 每章具备统一结构
- 为后续补充示例代码留出明确位置

执行动作：

- 创建 `tutorial/README.md`
- 创建 8 个章节 Markdown 文件
- 每章按照固定结构编写：
  - 学习目标
  - 核心概念
  - 操作步骤
  - 示例
  - 检查点

输出产物：

- `tutorial/README.md`
- `tutorial/01-why-harness.md`
- `tutorial/02-task-definition.md`
- `tutorial/03-agent-runner.md`
- `tutorial/04-tool-registry.md`
- `tutorial/05-trace-logger.md`
- `tutorial/06-evaluator.md`
- `tutorial/07-report.md`
- `tutorial/08-next-steps.md`

验收标准：

- 每章标题与方案文档章节一致
- 每章都有可执行检查点
- 章节之间顺序符合学习路径

### 阶段 3：搭建最小示例项目

目标：

- 建立一个可运行的 Harness Demo
- 让教程具备真实操作对象

执行动作：

- 创建 `agent-harness-demo/README.md`
- 创建 `requirements.txt`，写入 `PyYAML` 和 `pytest`
- 创建 `tasks/beginner.yaml`
- 创建 `src/__init__.py`
- 创建 `src/main.py`
- 创建核心模块文件

输出产物：

- `agent-harness-demo/`
- 可从命令行启动的最小项目

建议启动命令：

```bash
cd harness-tutorial/agent-harness-demo
python -m src.main --tasks tasks/beginner.yaml
```

验收标准：

- 命令行可以读取任务文件
- 程序可以逐条执行任务
- 程序可以输出运行结果

### 阶段 4：实现任务用例与加载逻辑

目标：

- 让 Harness 支持批量任务输入
- 建立稳定的回归测试基础

执行动作：

- 在 `tasks/beginner.yaml` 中定义 3 到 5 个任务
- 每个任务包含 `id`、`name`、`input`、`expected`、`constraints`
- 实现任务加载逻辑
- 增加任务加载测试

输出产物：

- `tasks/beginner.yaml`
- `src/task_loader.py`
- `tests/test_task_loader.py`

验收标准：

- 能读取全部任务
- 任务缺少必填字段时给出明确错误
- 测试能覆盖正常任务和异常任务

### 阶段 5：实现 Agent Runner 与 Tool Registry

目标：

- 让 Harness 能执行任务
- 让 Agent 可以调用基础工具

执行动作：

- 实现 `src/agent_runner.py`
- 实现 `src/tool_registry.py`
- 注册 `calculator` 工具
- 注册 `text_search` 工具
- 统一工具输入、输出和错误结构
- 增加 Agent Runner 和 Tool Registry 测试

输出产物：

- `src/agent_runner.py`
- `src/tool_registry.py`
- `tests/test_agent_runner.py`
- `tests/test_tool_registry.py`

验收标准：

- Agent Runner 能接收单个任务并返回结构化结果
- Tool Registry 能按名称查找工具
- 工具执行失败时不会中断整个批次

### 阶段 6：实现 Trace Logger

目标：

- 记录每次任务运行过程
- 为失败分析提供依据

执行动作：

- 实现 `src/trace_logger.py`
- 为每次运行生成 `run_id`
- 将开始时间、结束时间、模型名、输入、输出、工具调用、错误和耗时写入 JSON 文件
- 添加 Trace Logger 测试

输出产物：

- `src/trace_logger.py`
- `traces/sample-trace.json`
- `tests/test_trace_logger.py`

验收标准：

- 每次运行都有 Trace 文件
- Trace 文件包含 `run_id`、`task_id`、`start_time`、`end_time`、`model`、`input`、`tool_calls`、`final_output`、`error`、`duration_ms`
- JSON 文件可以被标准解析器读取

### 阶段 7：实现 Evaluator

目标：

- 对 Agent 输出进行基础自动评估
- 建立可复现的验收机制

执行动作：

- 实现 `src/evaluator.py`
- 支持 `must_include` 检查
- 支持 `max_words` 检查
- 输出 `pass`、`fail`、`reason`
- 添加 Evaluator 测试

输出产物：

- `src/evaluator.py`
- `tests/test_evaluator.py`

验收标准：

- 输出包含必需关键词时评估通过
- 输出缺少必需关键词时评估失败
- 输出超过字数限制时评估失败
- 失败原因可读且指向具体规则

### 阶段 8：生成运行报告

目标：

- 汇总任务运行和评估结果
- 生成便于教学展示的 Markdown 报告

执行动作：

- 实现 `src/report_writer.py`
- 汇总总任务数、通过数、失败数、平均耗时
- 列出失败任务详情
- 输出 Trace 文件路径
- 添加 Report Writer 测试

输出产物：

- `src/report_writer.py`
- `reports/sample-report.md`
- `tests/test_report_writer.py`

验收标准：

- 报告能展示整体通过率
- 报告能展示失败原因
- 报告能关联到 Trace 文件

### 阶段 9：补齐教程与示例联动

目标：

- 让教程正文和示例项目互相对应
- 学习者能按章节完成操作

执行动作：

- 在每章中加入对应文件路径
- 在每章中加入运行命令
- 在每章中加入预期输出说明
- 在 `tutorial/README.md` 中加入学习顺序

输出产物：

- 更新后的教程正文
- 完整学习路径说明

验收标准：

- 每章都能对应一个可运行动作或可检查产物
- 学习者无需阅读源码也能理解当前步骤目的
- 教程和代码路径一致

### 阶段 10：最终验证与交付

目标：

- 确认教程、代码、测试和报告形成闭环

执行动作：

- 安装依赖
- 运行单元测试
- 运行 Demo
- 检查 Trace 输出
- 检查 Report 输出
- 按验收清单逐项确认

建议验证命令：

```bash
cd harness-tutorial/agent-harness-demo
python -m pytest
python -m src.main --tasks tasks/beginner.yaml
```

输出产物：

- 最终教程目录
- 最终 Demo 项目
- 最终 Trace 示例
- 最终 Report 示例

验收标准：

- 测试全部通过
- Demo 可以从命令行运行
- Trace 文件生成成功
- Report 文件生成成功
- 教程章节与 Demo 行为一致

## 7. 时间安排建议

建议按 10 个工作日完成第一版：

| 工作日 | 重点任务 | 主要产物 |
| --- | --- | --- |
| 第 1 天 | 确认边界与执行方案 | 执行方案文档 |
| 第 2 天 | 教程正文骨架 | tutorial 目录 |
| 第 3 天 | Demo 项目骨架 | agent-harness-demo 目录 |
| 第 4 天 | 任务用例与加载逻辑 | beginner.yaml、task_loader |
| 第 5 天 | Agent Runner 与工具注册 | agent_runner、tool_registry |
| 第 6 天 | Trace Logger | trace_logger、sample trace |
| 第 7 天 | Evaluator | evaluator、测试用例 |
| 第 8 天 | Report Writer | report_writer、sample report |
| 第 9 天 | 教程与 Demo 联动 | 完整教程正文 |
| 第 10 天 | 验证与修订 | 验收结果 |

## 8. 任务清单

- [ ] 确认第一版教程范围
- [ ] 创建教程正文目录
- [ ] 创建 Demo 项目目录
- [ ] 编写 3 到 5 个任务用例
- [ ] 实现任务加载逻辑
- [ ] 实现 Agent Runner
- [ ] 实现 Tool Registry
- [ ] 实现 Trace Logger
- [ ] 实现 Evaluator
- [ ] 实现 Report Writer
- [ ] 编写单元测试
- [ ] 生成示例 Trace
- [ ] 生成示例 Report
- [ ] 补齐教程操作步骤
- [ ] 执行最终验收

## 9. 质量检查清单

内容质量：

- [ ] 概念解释准确
- [ ] 每章有明确学习目标
- [ ] 每章有可操作步骤
- [ ] 每章有检查点
- [ ] 示例与正文一致

工程质量：

- [ ] 模块职责清晰
- [ ] 文件命名一致
- [ ] 错误信息可读
- [ ] Trace 字段完整
- [ ] Evaluator 规则稳定

交付质量：

- [ ] Demo 可运行
- [ ] 测试可执行
- [ ] 报告可读
- [ ] 路径引用准确
- [ ] 第一版范围没有膨胀

## 10. 风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 教程过度平台化 | 初学者难以理解核心概念 | 第一版只保留最小闭环 |
| 示例代码复杂度过高 | 学习者无法跟随 | 每个模块保持单一职责 |
| Evaluator 判断模糊 | 验收结果不稳定 | 第一版优先使用规则评估 |
| Trace 记录不足 | 失败后难以定位原因 | 固定 Trace 字段并在测试中校验 |
| 教程正文与代码不一致 | 操作失败，影响学习体验 | 最终阶段逐章运行验证 |

## 11. 交付验收标准

第一版交付必须满足：

- 能从 `tutorial/README.md` 开始学习
- 能按照章节顺序理解 Harness 核心概念
- 能运行 `agent-harness-demo`
- 能批量执行任务
- 能生成 Trace 文件
- 能生成 Markdown Report
- 能通过基础单元测试
- 能通过文档中的最终验收清单

## 12. 后续扩展计划

第一版完成后，可按以下顺序扩展：

1. 增加 Prompt A/B 测试
2. 增加多模型对比
3. 增加成本统计
4. 增加失败用例分类
5. 增加 Trace 可视化页面
6. 增加人工评审表单
7. 增加 CI 回归验证

扩展原则：

- 每次只增加一个独立能力
- 每个能力必须配套任务用例
- 每个能力必须进入 Trace 或 Report
- 每个能力必须有明确验收标准
