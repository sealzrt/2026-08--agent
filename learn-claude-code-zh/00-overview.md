# learn-claude-code 中文版：从零构建 Agent Harness

> 原课程：[shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code)
> 本版本基于原课程翻译整理，所有代码示例使用 DeepSeek API，增加了中文注解和类比说明。

---

## 课程定位：Agent = Model + Harness

在写任何代码之前，先明确一件事：

**智能（Agency）来自模型训练，而不是外部代码编排。** 模型是"司机"，负责思考；Harness 是"车"，负责让思考变成可执行、可控、可扩展的行动。

本课程教你**造车**。不是造司机。

```
Harness = 工具 + 知识 + 观察能力 + 行动接口 + 权限边界

工具：      文件读写、Shell 执行、网络请求、数据库查询
知识：      产品文档、领域参考、API 规范、编码风格
观察能力：  git diff、错误日志、浏览器状态、传感器数据
行动接口：  CLI 命令、API 调用、UI 操作
权限边界：  沙箱隔离、审批流程、信任边界
```

模型负责决策，Harness 负责执行。模型负责推理，Harness 负责提供上下文。

---

## 核心模式

整个课程围绕这一个循环展开：

```
用户 --> messages[] --> LLM --> response
                                  |
                       有工具调用？
                      /            \
                    是              否
                    |               |
               执行工具         返回文本
               追加结果
               循环回到 messages[]
```

模型决定何时调用工具、何时停止。代码只执行模型的请求。17 个章节都在这一个循环上添加机制——循环不变，工具、知识、权限在变。

---

## 章节地图：7 个阶段 17 章

| 阶段 | 章节 | 主题 | 一句话概括 | 类比 |
|------|------|------|-----------|------|
| **1. 让 Agent 行动起来** | s01 | 智能体循环 | 一个循环 + 一个工具 = 一个 Agent | 给助手一部对讲机，说完了等你回复 |
| | s02 | 工具调用 | 加一个工具 = 加一行映射 | 给助手一个工具箱，需要什么拿什么 |
| | s03 | 权限系统 | 先设边界，再给自由 | 给助手一把钥匙，但有些门不让开 |
| | s04 | 钩子系统 | 在循环周围挂钩子，不改循环 | 在助手的必经之路上设检查站 |
| **2. 处理复杂工作** | s05 | 任务清单 | 没有计划的 Agent 会迷失方向 | 做菜前列个清单，免得漏步骤 |
| | s06 | 子代理 | 给子任务一个全新的上下文 | 派一个助手去查资料，只带结论回来 |
| | s08 | 上下文压缩 | 上下文总会满，要有办法腾空间 | 桌面太小，把旧文件归档腾出空间 |
| **3. 跨会话记忆** | s09 | 记忆系统 | 记住重要的，忘掉不重要的 | 你的笔记本——只记关键信息，不记流水账 |
| **4. 运行长任务** | s10 | 任务系统 | 大目标拆成小任务，持久化到磁盘 | 项目看板——任务卡有状态和依赖关系 |
| | s11 | 后台任务 | 慢操作走后台，Agent 继续思考 | 让洗衣机转着，你去做别的菜 |
| | s12 | 定时调度 | 定时触发，不需要人工启动 | 给助手设一个闹钟，到点自动干活 |
| **5. 多 Agent 协作** | s13 | 智能体团队 | 太大了就分给队友做 | 项目经理分配任务，团队成员并行工作 |
| **6. 扩展与组装** | s07 | 技能加载 | 按需加载知识，不要一开始全塞进去 | 书架上有很多书，用到哪本拿哪本 |
| | s14 | MCP 插件 | 能力不够就通过 MCP 接入更多 | USB 接口——不同设备用同一种插头 |
| | s15 | 集成 Harness | 多种机制，一个循环 | 把前面所有零件装到一辆车上 |
| **7. 编排与目标收敛** | s16 | 工作流运行时 | 固定的编排就写进代码 | 流水线——每道工序的顺序是固定的 |
| | s17 | 目标循环 | 由目标决定循环何时可以停止 | 质检员——每轮检查"达标了吗？" |

---

## 概念依赖图

```
s01 智能体循环
 └── s02 工具调用
      ├── s03 权限系统
      │    └── s04 钩子系统
      │         ├── s05 任务清单
      │         │    └── s06 子代理
      │         │         └── s07 技能加载
      │         ├── s08 上下文压缩
      │         │    └── s09 记忆系统
      │         ├── s10 任务系统
      │         │    ├── s11 后台任务
      │         │    ├── s12 定时调度
      │         │    └── s13 智能体团队
      │         └── s14 MCP 插件
      │              └── s15 集成 Harness
      │                   ├── s16 工作流运行时
      │                   └── s17 目标循环
```

---

## 学习路径建议

### 完整路径（适合系统学习）

按 s01 → s17 顺序阅读，每章约 30-60 分钟。预计总耗时 2-3 周。

### 快速路径（适合抓主线）

优先阅读以下 7 章，快速建立全局认知：

1. **s01** 智能体循环 — 理解最核心的循环
2. **s02** 工具调用 — 理解工具分发机制
3. **s03** 权限系统 — 理解安全边界
4. **s06** 子代理 — 理解上下文隔离
5. **s08** 上下文压缩 — 理解长会话管理
6. **s10** 任务系统 — 理解任务持久化
7. **s15** 集成 Harness — 理解所有机制如何组合

---

## DeepSeek 环境配置指南

### 1. 获取 API Key

前往 [DeepSeek 开放平台](https://platform.deepseek.com/) 注册并获取 API Key。

### 2. 安装依赖

```bash
pip install openai python-dotenv
```

DeepSeek 兼容 OpenAI SDK，因此使用 `openai` 包即可。

### 3. 配置环境变量

在项目根目录创建 `.env` 文件：

```bash
DEEPSEEK_API_KEY=sk-your-key-here
MODEL_ID=deepseek-chat
```

### 4. 运行代码

```python
import os
from openai import OpenAI   # DeepSeek 兼容 OpenAI SDK，所以使用 openai 包
from dotenv import load_dotenv

# 从 .env 文件加载环境变量（DEEPSEEK_API_KEY、MODEL_ID）
load_dotenv()

# 创建 DeepSeek API 客户端
# DeepSeek 兼容 OpenAI 协议，只需把 base_url 指向 DeepSeek 的服务地址
deepseek_client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),   # 从环境变量读取 API Key
    base_url="https://api.deepseek.com",      # DeepSeek API 地址（替代 OpenAI 默认地址）
)

# 发送一条简单的对话请求，验证 API 是否连通
response = deepseek_client.chat.completions.create(
    model=os.getenv("MODEL_ID", "deepseek-chat"),  # 使用 deepseek-chat（DeepSeek-V3）
    messages=[{"role": "user", "content": "你好"}],  # 用户消息
)
# 打印模型的回复
print(response.choices[0].message.content)
```

---

## 每章代码运行命令一览

```bash
# 阶段 1：让 Agent 行动起来
python stage-1-让Agent行动起来/s01-agent-loop.py
python stage-1-让Agent行动起来/s02-tool-use.py
python stage-1-让Agent行动起来/s03-permission.py
python stage-1-让Agent行动起来/s04-hooks.py

# 阶段 2：处理复杂工作
python stage-2-处理复杂工作/s05-todo-write.py
python stage-2-处理复杂工作/s06-subagent.py
python stage-2-处理复杂工作/s08-context-compact.py

# 阶段 3：跨会话记忆
python stage-3-跨会话记忆/s09-memory.py

# 阶段 4：运行长任务
python stage-4-运行长任务/s10-task-system.py
python stage-4-运行长任务/s11-background-tasks.py
python stage-4-运行长任务/s12-cron-scheduler.py

# 阶段 5：多 Agent 协作
python stage-5-多Agent协作/s13-agent-teams.py

# 阶段 6：扩展与组装
python stage-6-扩展与组装/s07-skill-loading.py
python stage-6-扩展与组装/s14-mcp-plugin.py
python stage-6-扩展与组装/s15-integrated-harness.py

# 阶段 7：编排与目标收敛
python stage-7-编排与目标收敛/s16-workflow-runtime.py
python stage-7-编排与目标收敛/s17-goal-loop.py
```

---

## 原课程与原仓库的对应关系

本版本对原课程做了以下调整：

1. **语言**：翻译为流畅的中文，保留关键技术术语（附英文原文）
2. **API**：所有代码从 Anthropic/OpenAI API 替换为 DeepSeek API
3. **注解**：每章增加问题引入、类比说明、章节过渡桥接、常见坑提示
4. **结构**：保持原课程 s01-s17 的章节编号和核心内容不变

原仓库地址：https://github.com/shareAI-lab/learn-claude-code
