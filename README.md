# Agent 基础设施与 Harness 学习仓库

> 围绕 **Agent = Model + Harness** 核心思想，系统学习 AI Agent 运行环境的设计与实现。

---

## 仓库定位

这个仓库不是在教你"怎么再做一个模型"，而是在教你理解一个真正可工作的 Agent Harness 是怎么搭起来的。

```
模型负责思考，Harness 负责让思考变成可执行、可控、可扩展的行动。
```

仓库包含四条学习线路、一份可视化教程、两份调研文档和一份开源项目源码分析，覆盖从产品选型到工程实现的完整路径。

---

## 目录结构

```
├── learn-claude-code-zh/       # 线路 1：从零构建 Agent Harness（中文实操版）
│   ├── 00-overview.md          #   总览与环境配置
│   ├── stage-1-让Agent行动起来/  #   s01-s04 循环、工具、权限、钩子
│   ├── stage-2-处理复杂工作/    #   s05-s08 任务清单、子代理、上下文压缩
│   ├── stage-3-跨会话记忆/      #   s09 记忆系统
│   ├── stage-4-运行长任务/      #   s10-s12 任务系统、后台任务、定时调度
│   ├── stage-5-多Agent协作/     #   s13 智能体团队
│   ├── stage-6-扩展与组装/      #   s07/s14-s15 技能加载、MCP、集成
│   └── stage-7-编排与目标收敛/   #   s16-s17 工作流、目标循环
│
├── harness-tutorial/           # 线路 2：Harness 入门教程（概念导向）
│   └── tutorial/               #   8 章：Task → Agent → Trace → Evaluate → Report
│
├── harness-visual-tutorial/    # 线路 2.5：Harness 可视化教程（图解 + 代码）
│   ├── ch01 ~ ch10/            #   10 章，每章 2-3 张 PNG 图解
│   └── images/                 #   28 张高清图解
│
├── hello-agents-chapters/      # 线路 3：Hello Agents 课程（18 章全景）
│   ├── ch01 ~ ch11/            #   LLM 基础、工具调用、Agent 范式、记忆、RAG…
│   ├── ch12-16/                #   多 Agent、评估、RL、安全、落地
│   └── ch17-18/                #   前沿与展望
│
├── deepseek-harness-docs/      # 源码分析：DeepSeek Harness 架构与插件系统
│   ├── architecture.md         #   项目架构全景（3 张图解）
│   ├── plugin-system.md        #   插件系统详解（3 张图解）
│   └── images/                 #   6 张高清架构图
│
├── learn-claude-code-study-plan.md  # 原课程学习方案与章节地图
├── agent-infra-products.md          # Agent Infra 产品与开源项目调研
└── ai-infra-and-managed-agents.md   # AI Infra 与 Managed Agents 概述
```

---

## 三条学习线路

### 线路 1：从零构建 Agent Harness（推荐实操）

基于 [shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) 翻译整理的中文版本，所有代码使用 **DeepSeek API**。

**核心模式：**
```
用户 → messages[] → LLM → response → 有工具调用？→ 执行 / 返回
```

7 个阶段、17 章，每章在一个统一循环上叠加新机制——循环不变，工具、知识、权限在变。

| 阶段 | 章节 | 关键词 |
|------|------|--------|
| 1. 让 Agent 行动起来 | s01-s04 | 循环、工具调用、权限、钩子 |
| 2. 处理复杂工作 | s05-s08 | 任务清单、子代理、上下文压缩 |
| 3. 跨会话记忆 | s09 | 记忆系统 |
| 4. 运行长任务 | s10-s12 | 任务持久化、后台执行、定时调度 |
| 5. 多 Agent 协作 | s13 | 智能体团队 |
| 6. 扩展与组装 | s07/s14-s15 | 技能加载、MCP 插件、集成 Harness |
| 7. 编排与目标收敛 | s16-s17 | 工作流运行时、目标循环 |

### 线路 2：Harness 入门教程

面向初学者的概念教程，帮你理解 Harness 各模块的职责边界：

`Task → Agent Runner → Tool Registry → Trace Logger → Evaluator → Report`

### 线路 2.5：Harness 可视化教程（图解 + 代码）

**每章 2-3 张 PNG 图解**，用 Python + DeepSeek 从零搭建完整 Agent，10 章渐进式叠加。

| 章节 | 主题 | 类比 |
|------|------|------|
| ch01 | 什么是 Harness | 实习生 + 办公环境 |
| ch02 | Agent 循环 | 对讲机对话 |
| ch03 | 工具调用 | 工具箱 |
| ch04 | 权限系统 | 钥匙和门禁 |
| ch05 | 记忆系统 | 笔记本 |
| ch06 | 子代理 | 派助手查资料 |
| ch07 | 错误处理 | 备用方案 |
| ch08 | 上下文管理 | 桌面整理 |
| ch09 | 完整组装 | 组装汽车 |
| ch10 | 后续方向 | 升级路线 |

适合**看图学习**的读者，代码可直接运行。详见 [harness-visual-tutorial/](harness-visual-tutorial/README.md)。

### 线路 3：Hello Agents 课程

18 章全景课程，覆盖 LLM 基础、工具调用、Agent 范式、记忆与 RAG、上下文工程、低代码平台、通信协议、多 Agent、评估、安全对齐到生产落地。

---

## 快速开始

### 1. 安装依赖

```bash
pip install openai python-dotenv
```

DeepSeek 兼容 OpenAI SDK，使用 `openai` 包即可。

### 2. 配置环境变量

在项目根目录创建 `.env` 文件：

```bash
DEEPSEEK_API_KEY=sk-your-key-here
MODEL_ID=deepseek-chat
```

API Key 从 [DeepSeek 开放平台](https://platform.deepseek.com/) 获取。

### 3. 运行第一章节

```bash
cd learn-claude-code-zh
python stage-1-让Agent行动起来/s01-agent-loop.py
```

---

## 学习路径建议

| 路径 | 适合人群 | 推荐章节 |
|------|---------|---------|
| **快速路径** | 抓主线 | s01 → s02 → s03 → s06 → s08 → s10 → s15 |
| **完整路径** | 系统学习 | s01 → s17 顺序阅读，每章 30-60 分钟 |
| **图解入门** | 零基础看图 | harness-visual-tutorial ch01 → ch10 |
| **源码研读** | 理解真实框架 | deepseek-harness-docs architecture → plugin-system |
| **产品选型** | 方案调研 | 先读 `agent-infra-products.md`，再按兴趣深入 |

---

## 配套文档

- [deepseek-harness-docs/](deepseek-harness-docs/README.md) — DeepSeek Harness 开源项目架构与插件系统分析（6 张高清图解）
- [learn-claude-code-study-plan.md](learn-claude-code-study-plan.md) — 原课程 20 章的学习方案与阅读指南
- [agent-infra-products.md](agent-infra-products.md) — Agent Infra 商业产品与开源项目对比
- [ai-infra-and-managed-agents.md](ai-infra-and-managed-agents.md) — AI 基础设施与 Managed Agents 概述

---

## License

本仓库为学习笔记，原课程参考 [shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code)。
