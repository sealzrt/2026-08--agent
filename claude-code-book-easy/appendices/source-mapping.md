# 原课程章节映射

本文档记录《御舆：解码 Agent Harness · Claude Code 架构深度剖析》与本整理版的对应关系。

本整理版必须以原课程为主线。章节顺序、部分划分和主题边界原则上不改变，只增加导读、拆解、检查点和通用 Harness 迁移说明。

原课程入口：<https://lintsinghua.github.io/#preface>

补充文件：

- [architecture-learning-map.md](architecture-learning-map.md)：全书架构学习地图
- [enrichment-priority.md](enrichment-priority.md)：一到十二章后续加厚优先级清单

## 映射总览

| 原课程位置 | 原课程主题 | 整理版文件 | 整理重点 |
|------------|------------|------------|----------|
| 前言 | 为什么写这本书 | `00-preface.md` | 明确课程定位、学习目标和阅读方法 |
| 第 1 章 | 智能体编程新范式 | `part-1-foundation/01-agent-programming-paradigm.md` | 建立 Agent Harness 的整体心智模型 |
| 第 2 章 | 对话循环：Agent 的心跳 | `part-1-foundation/02-conversation-loop.md` | 拆解 message、模型响应、工具回填和循环终止 |
| 第 3 章 | 工具系统：Agent 的手和眼 | `part-1-foundation/03-tool-system.md` | 区分工具定义、选择、执行、结果回填和错误处理 |
| 第 4 章 | 权限管线：安全边界 | `part-1-foundation/04-permission-pipeline.md` | 把权限拆成策略、作用域、审批、沙箱和审计 |
| 第 5 章 | 设置与配置系统 | `part-2-core-architecture/05-settings-and-config.md` | 理解配置层级、默认值、覆盖规则和项目约定 |
| 第 6 章 | 记忆系统 | `part-2-core-architecture/06-memory-system.md` | 区分长期记忆、项目知识、会话状态和上下文召回 |
| 第 7 章 | 上下文管理 | `part-2-core-architecture/07-context-management.md` | 解释 token 预算、信息优先级、压缩、裁剪和恢复 |
| 第 8 章 | 钩子系统 | `part-2-core-architecture/08-hooks-lifecycle.md` | 从生命周期节点理解扩展点和控制点 |
| 第 9 章 | 子智能体与 Fork | `part-3-advanced-systems/09-subagent.md` | 区分工具调用、后台任务、Subagent 和多 Agent 协作 |
| 第 10 章 | 协调器模式 | `part-3-advanced-systems/10-coordinator.md` | 理解任务拆分、结果整合、冲突控制和主从边界 |
| 第 11 章 | 技能系统 | `part-3-advanced-systems/11-skills.md` | 理解按需加载知识、流程包和任务专用能力 |
| 第 12 章 | MCP 集成 | `part-3-advanced-systems/12-mcp.md` | 区分 MCP、工具、插件、外部服务和能力协议 |
| 第 13 章 | 流式架构与性能 | `part-4-engineering-practice/13-streaming-and-performance.md` | 理解流式输出、响应体验、后台执行和性能边界 |
| 第 14 章 | Plan 模式 | `part-4-engineering-practice/14-plan-mode.md` | 把 Plan Mode 理解成先规划、再执行、再验证的约束 |
| 第 15 章 | 构建自己的 Agent Harness | `part-4-engineering-practice/15-build-your-own-harness.md` | 汇总前面机制，形成最小可运行 Harness 架构 |
| 附录 A | 架构导航地图 | `appendices/appendix-a-architecture-map.md` | 把全书机制整理成概念地图 |
| 附录 B | 工具清单 | `appendices/appendix-b-tool-list.md` | 汇总工具类型、边界和使用场景 |
| 附录 C | 功能标志 | `appendices/appendix-c-feature-flags.md` | 解释功能开关在 Harness 演进中的作用 |
| 附录 D | 术语表 | `appendices/appendix-d-glossary.md` | 对齐原课程术语 |

## 每章整理要求

每个章节文件都必须包含以下学习层：

1. 原课程对应位置。
2. 本章要解决的问题。
3. 一句话理解。
4. 学前概念。
5. 原课程内容地图。
6. 核心机制拆解。
7. 流程图、表格或结构化流程。
8. Claude Code 具体实现。
9. 通用 Harness 设计原则。
10. 常见误解。
11. 学完检查点。
12. 进一步练习。

## 章节边界

整理时需要避免以下偏移：

- 不把第 2 章的对话循环扩展成完整 Agent 教程。
- 不把第 3 章的工具系统写成普通 function calling 教程。
- 不把第 4 章的权限管线简化成 allow/deny。
- 不把第 6 章的记忆系统混同为上下文压缩。
- 不把第 7 章的上下文管理混同为长期记忆。
- 不把第 9 章的 Subagent 混同为普通工具调用。
- 不把第 12 章的 MCP 混同为插件市场。
- 不把第 14 章的 Plan 模式混同为 todo list。
- 不把第 15 章改写成全新的工程项目教程。

## 后续维护规则

- 如果原课程章节标题或结构变化，先更新本文档，再更新对应章节。
- 如果整理版需要补充额外内容，必须放在“通用 Harness 迁移”或“进一步练习”中，不能改变原课程主线。
- 如果某章需要跨章节解释，应在当前章做最小解释，并链接到对应章节，避免重复展开。
