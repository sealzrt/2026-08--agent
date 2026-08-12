# learn-claude-code 学习方案

## 1. 目标

这份方案用于帮助你系统学习 [shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code)。

这个仓库不是在教你“怎么再做一个 Claude”，而是在教你理解一个真正可工作的 Agent Harness 是怎么搭起来的。核心思想很简单：

```text
模型负责思考，Harness 负责让思考变成可执行、可控、可扩展的行动。
```

如果把 Agent 比作“会思考的人”，那么 Harness 就是“这个人能安全工作的一整套环境”。它包括循环、工具、权限、任务、子代理、记忆、调度、工作目录隔离等能力。

## 2. 先理解这仓库在讲什么

仓库首页已经把主线说得很清楚：`Agent = Model + Harness`。这里的重点不是模型本身，而是模型外面那层运行环境。

你可以把它理解成三层：

1. 模型负责产生决策
2. Harness 负责把决策变成动作
3. 外部世界负责提供上下文、工具和约束

这也是为什么仓库前几章先讲 `Agent Loop`、`Tool Use`、`Permission`，然后才讲 `Subagent`、`Skill Loading`、`Memory`、`Task System` 这类更复杂的机制。它不是随便堆功能，而是按 Harness 的演化顺序组织的。

## 3. 推荐阅读方式

仓库现在有两条内容线：

- 当前主线：根目录 `s01_*` 到 `s20_*`
- 旧版过渡线：`docs/`、`agents/`、当前 `web/` 应用里的旧章节

如果你是新读者，直接读根目录的 20 章，不要混着看旧版 12 章。旧版有参考价值，但章节编号已经不完全对应。

建议顺序如下：

1. 先看 `README.md` 或 `README-zh.md`
2. 再按 `s01` 到 `s20` 读
3. 每章先看 `README.md`
4. 再看 `code.py`
5. 最后看图和扩展说明

这样最不容易迷路。

## 4. 章节地图

我建议把 20 章分成 6 个阶段来理解，而不是把它们当成 20 个孤立主题。

先给一个总表，帮助你快速建立全局印象：

| 章节 | 作用 |
| --- | --- |
| `s01_agent_loop` | 让 Agent 先跑起来，理解最基本的思考-行动循环 |
| `s02_tool_use` | 学会把工具接入 Agent，让它能做事而不是只聊天 |
| `s03_permission` | 给 Agent 加边界，控制哪些操作允许执行 |
| `s04_hooks` | 在执行前后插入检查和扩展逻辑 |
| `s05_todo_write` | 用任务清单把工作拆开，避免一次做太多 |
| `s06_subagent` | 把复杂任务拆给子代理，提高并行和专注度 |
| `s07_skill_loading` | 按需加载技能，避免上下文和能力过载 |
| `s08_context_compact` | 压缩上下文，保留重点，减少冗余 |
| `s09_memory` | 让 Agent 记住重要信息，支持后续任务 |
| `s10_system_prompt` | 理解 system prompt 如何决定 Agent 的运行风格 |
| `s11_error_recovery` | 处理错误、重试和降级，让 Agent 更稳 |
| `s12_task_system` | 把任务变成可管理、可执行、可追踪的数据 |
| `s13_background_tasks` | 支持长任务后台运行，不阻塞主流程 |
| `s14_cron_scheduler` | 让任务定时触发，形成自动化工作流 |
| `s15_agent_teams` | 让多个 Agent 协作，分工处理复杂工作 |
| `s16_team_protocols` | 规范团队内部通信，避免互相误解 |
| `s17_autonomous_agents` | 让 Agent 能更独立地持续完成任务 |
| `s18_worktree_isolation` | 给并行工作提供隔离环境，减少互相干扰 |
| `s19_mcp_plugin` | 接入外部能力，把工具生态扩展进 Harness |
| `s20_comprehensive` | 把前面所有机制合起来，看完整系统长什么样 |

### 阶段一：先让 Agent 跑起来

对应章节：

- `s01 Agent Loop`
- `s02 Tool Use`

这两章解决的是最基本的问题：Agent 怎么形成一个持续工作的循环，怎么让它调用工具。

理解重点：

- `while True` 不是为了代码好看，而是为了让 Agent 可以持续接收新消息
- `TOOL_HANDLERS` 不是装饰品，而是工具分发中心
- 工具一旦加入，循环本身不该大改，应该只是接入一个 dispatch map

如果你只想先抓住全书的骨架，就先吃透这两章。

### 阶段二：让 Agent 变得可控

对应章节：

- `s03 Permission System`
- `s04 Hook System`
- `s05 TodoWrite`

这一阶段回答的是“Agent 不能只会干活，还要能被管住”。

你会学到：

- 什么操作需要审批
- 在工具调用前后怎么插钩子
- 为什么先计划再执行能降低混乱

这里最关键的理解是：Harness 不是把模型放出去裸奔，而是给它一套规则和检查点。

### 阶段三：让 Agent 能分身和吸收知识

对应章节：

- `s06 Subagent`
- `s07 Skill Loading`
- `s08 Context Compact`
- `s09 Memory System`

这一阶段开始进入“更像真实 Agent 产品”的部分。

你会看到：

- 为什么要把子任务拆给子代理
- 为什么技能要按需加载，而不是一开始全塞进上下文
- 为什么上下文要压缩，不然会被历史对话撑爆
- 为什么还需要记忆系统来做选择、提取和沉淀

这几章的共同主题是：**信息不是越多越好，而是越合适越好。**

### 阶段四：让 Agent 的 Prompt 和错误处理更像产品

对应章节：

- `s10 System Prompt`
- `s11 Error Recovery`

这部分会把很多人容易忽略的细节讲清楚。

你会明白：

- system prompt 不是一坨固定文本，而是运行时组装出来的
- 出错不是终点，很多时候只是提示你该换策略、换模型、或重试

这一阶段很重要，因为它会改变你对“提示词工程”的理解：不是写一段死 prompt，而是做一个可组合的 prompt 运行系统。

### 阶段五：让任务和协作真正落地

对应章节：

- `s12 Task System`
- `s13 Background Tasks`
- `s14 Cron Scheduler`
- `s15 Agent Teams`
- `s16 Team Protocols`
- `s17 Autonomous Agents`
- `s18 Worktree Isolation`

这是一组很像“生产环境雏形”的章节。

它们解决的是：

- 任务怎么持久化
- 慢任务怎么后台执行
- 定时任务怎么自动触发
- 多 Agent 怎么协作
- 团队之间怎么通信
- Agent 怎么在不干扰彼此的目录里并行工作

如果说前面几章是在讲“一个 Agent 怎么工作”，那这一组就是在讲“多个 Agent 怎么一起工作”。

### 阶段六：扩展能力并收束成完整系统

对应章节：

- `s19 MCP Plugin`
- `s20 Comprehensive Agent`

这两章是收束章。

前者讲如何把外部工具接进同一个能力池，后者把前面所有机制重新合起来，形成一个完整的 Agent Harness。

读到这里时，你应该已经能回答一个关键问题：

> 为什么一个真正好用的 Agent 产品，重点不只是模型，而是模型外面的那整套环境？

## 5. 每章怎么读

每章建议按这个顺序：

1. 先看章节标题和开头说明
2. 再看关键概念
3. 然后看代码
4. 最后看图和小结

不要一上来就盯着代码细节。这个仓库的代码是为理解架构服务的，不是为了炫技巧。

如果某章你看完还是觉得抽象，通常不是你不行，而是你还没把它放回 Harness 的整体上下文里。把它放回这四个问题里去看：

- 它解决什么问题？
- 它依赖前面哪一章？
- 它会给后面哪一章铺路？
- 它是为了简化什么复杂性？

## 6. 推荐学习路线

如果你是第一次读，建议这样走：

1. `s01`
2. `s02`
3. `s03`
4. `s04`
5. `s05`
6. `s06`
7. `s07`
8. `s08`
9. `s09`
10. `s10`
11. `s11`
12. `s12`
13. `s13`
14. `s14`
15. `s15`
16. `s16`
17. `s17`
18. `s18`
19. `s19`
20. `s20`

如果你时间有限，优先看：

- `s01 Agent Loop`
- `s02 Tool Use`
- `s03 Permission System`
- `s06 Subagent`
- `s08 Context Compact`
- `s10 System Prompt`
- `s11 Error Recovery`
- `s12 Task System`
- `s20 Comprehensive Agent`

这几章能最快让你抓住全书主线。

## 7. 适合你的理解方式

如果你是工程背景，建议重点看：

- 代码结构
- 运行边界
- 输入输出协议
- 任务持久化
- 错误恢复

如果你是产品或方案背景，建议重点看：

- 为什么要这么拆章节
- 每个机制解决什么真实问题
- 为什么这些机制必须组合在一起

如果你是想直接做 Agent 产品的人，建议重点看：

- tool use
- permission
- task system
- subagent
- worktree isolation
- MCP plugin

## 8. 一句话总结

这份仓库最重要的价值，不是给你一套现成产品，而是让你看懂：

**一个真正可用的 Agent，不是“会聊天的模型”，而是“模型 + Harness + 约束 + 工具 + 记忆 + 协作”的系统。**
