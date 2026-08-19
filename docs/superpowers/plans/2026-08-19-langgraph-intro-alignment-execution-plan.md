# LangGraph 入门教程对齐与硬化执行计划

## 关联文档
- 设计澄清：`docs/superpowers/specs/2026-08-19-langgraph-intro-alignment-design.md`

## 任务总览
| # | 任务 | 文件数 | 依赖 | 可并行 |
|---|------|--------|------|--------|
| 1 | 文档入口与章节命令对齐 | 3 | 无 | 否 |
| 2 | 项目 README 与生产说明对齐 | 3 | Task-1 | 否 |
| 3 | API 请求/响应与状态字段补齐 | 3 | Task-1 | 否 |
| 4 | 图节点逻辑补风险与审批时间 | 3 | Task-3 | 否 |
| 5 | 代码入口、检索去重与配置稳健性 | 3 | Task-3 | 否 |
| 6 | 测试更新与回归覆盖 | 2 | Task-3, Task-4, Task-5 | 否 |
| 7 | 发布卫生：.gitignore 与依赖清单 | 2 | 无 | 是 |

## 详细任务

### Task-1: 文档入口与章节命令对齐
- **文件**:
  - `ai-agent学习/06.LangGraph入门/README.md`
  - `ai-agent学习/06.LangGraph入门/01.LangGraph是什么.md`
  - `ai-agent学习/06.LangGraph入门/12.流式输出与前端集成.md`
- **改动**:
  - 修正根 README 的前置安装、章节映射和 notebook 说明。
  - 把第 01 章不存在的 `01_basic_flow.py` 改成真实路径或改成内联演示说明。
  - 统一第 12 章 API 介绍与教程级 demo 的行为描述，避免把同步 demo 写成完整异步后端。
- **依赖**: 无
- **验证**: 人工检查文档中的路径与命令均指向真实文件；抽查章节命令不再引用不存在脚本。

### Task-2: 项目 README 与生产说明对齐
- **文件**:
  - `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/README.md`
  - `ai-agent学习/06.LangGraph入门/14.项目化目录结构.md`
  - `ai-agent学习/06.LangGraph入门/15.部署与生产化注意事项.md`
- **改动**:
  - 统一项目 README 的安装、运行、API 与测试说明。
  - 修正第 14 章中“API 只做输入输出转换”等过于绝对的表述。
  - 把第 15 章生产化要求与项目当前实现边界对齐，明确哪些是 demo、哪些是待升级项。
- **依赖**: Task-1
- **验证**: README 与正文中的安装/运行命令保持一致；生产化描述不再与实际实现冲突。

### Task-3: API 请求/响应与状态字段补齐
- **文件**:
  - `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/app/api/schemas.py`
  - `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/app/state.py`
  - `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/app/api/main.py`
- **改动**:
  - 给 API 请求字段加基础长度与空白约束。
  - 扩充 `TaskResponse`，让状态、质量分、风险提示、审批信息、错误信息可见。
  - 保存并暴露 interrupt 载荷，便于前端或调用方读取草稿与审批问题。
- **依赖**: Task-1
- **验证**: Pydantic 模型字段完整；任务查询、报告、事件接口都能返回新增信息。

### Task-4: 图节点逻辑补风险与审批时间
- **文件**:
  - `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/app/nodes/evaluate.py`
  - `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/app/nodes/human_review.py`
  - `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/app/nodes/report.py`
- **改动**:
  - 在最大轮次仍不达标时写入风险提示。
  - 人工审批时记录审批时间。
  - 最终报告把风险提示和驳回意见带进去。
- **依赖**: Task-3
- **验证**: 节点纯函数单测覆盖批准/驳回/风险三种结果。

### Task-5: 代码入口、检索去重与配置稳健性
- **文件**:
  - `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/app/nodes/analyze.py`
  - `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/app/nodes/search.py`
  - `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/app/config.py`
- **改动**:
  - 把主题是否检索的规则抽出为可读的小函数。
  - 对重复检索结果去重，避免循环重试时重复灌入相同资料。
  - 让布尔与数值配置的解析更稳健，非法值报错更清楚。
- **依赖**: Task-3
- **验证**: 检索重试时 document 数不重复膨胀；非法配置能被明确发现。

### Task-6: 测试更新与回归覆盖
- **文件**:
  - `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/tests/test_nodes.py`
  - `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/tests/test_graph.py`
- **改动**:
  - 增加对新状态字段、风险提示、审批时间、去重逻辑的断言。
  - 修正短主题用例，确保命中“无需检索”分支。
- **依赖**: Task-3、Task-4、Task-5
- **验证**: 节点测试与图级测试覆盖新增行为，不再依赖过时假设。

### Task-7: 发布卫生：.gitignore 与依赖清单
- **文件**:
  - `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/.gitignore`
  - `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/pyproject.toml`
- **改动**:
  - 忽略 `.env`、虚拟环境、缓存目录。
  - 补齐 `build-system`，让项目元数据更完整。
- **依赖**: 无
- **验证**: 仓库不再把本地密钥和缓存文件纳入版本控制意外区。

## 执行顺序

Task-1 -> Task-2 -> Task-3 -> Task-4 -> Task-5 -> Task-6
Task-7 可并行推进。

## 风险任务（需要额外关注的 task）

- Task-3：API 响应结构变动会牵动多处文档与测试。
- Task-4：状态字段增加后，图节点和测试要同步更新，否则容易出现字段缺失。
- Task-5：配置解析变严格后，现有示例环境变量如果写错会直接报错。

