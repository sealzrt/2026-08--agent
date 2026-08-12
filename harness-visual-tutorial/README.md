# Harness 可视化入门教程

> 10 章 + 28 张高清图解 + Python/DeepSeek 代码，从零理解 Agent Harness。

---

## 什么是 Harness？

```
Agent = Model（大脑）+ Harness（工作环境）
```

模型负责思考，Harness 负责让思考变成**可执行、可控、可观测**的行动。这个教程教你**造车**，不是造司机。

---

## 章节地图

每章 2-3 张图解，渐进式叠加，每章只加一个新机制。

| 章 | 主题 | 一句话 | 类比 | 图解数 |
|----|------|--------|------|--------|
| [01](ch01-what-is-harness.md) | 什么是 Harness | 实习生需要办公环境 | 实习生 + 办公环境 | 3 |
| [02](ch02-agent-loop.md) | Agent 循环 | 对讲机：说完了等你回复 | 对讲机对话 | 3 |
| [03](ch03-tool-use.md) | 工具调用 | 给考生配工具箱 | 工具箱 | 3 |
| [04](ch04-permission.md) | 权限系统 | 有些门不让开 | 钥匙和门禁 | 3 |
| [05](ch05-memory.md) | 记忆系统 | 笔记本：只记关键信息 | 笔记本 | 3 |
| [06](ch06-subagent.md) | 子代理 | 派助手去查资料 | 派助手 | 3 |
| [07](ch07-error-handling.md) | 错误处理 | 出错了有备用方案 | 备用方案 | 3 |
| [08](ch08-context-management.md) | 上下文管理 | 桌面太小要整理 | 桌面整理 | 3 |
| [09](ch09-assembly.md) | 完整组装 | 把所有零件装到一辆车上 | 组装汽车 | 2 |
| [10](ch10-next-steps.md) | 后续方向 | 升级装备路线图 | 升级路线 | 2 |

---

## 快速开始

### 先怎么学？

建议每章都按这个顺序走：

1. **先看图**：先用图建立直觉，不急着看代码。
2. **再看类比**：把新概念放到生活场景里理解。
3. **再看代码**：先找本章新增的那几段，不要一上来逐行背。
4. **最后运行**：复制完整代码跑一遍，再做练习。

每章都是独立示例。你可以把当章代码复制成一个新的 `.py` 文件运行，不需要先完成前一章的文件。

### 1. 安装依赖

```bash
pip install openai python-dotenv
```

### 2. 配置 API Key

在项目根目录创建 `.env` 文件：

```bash
DEEPSEEK_API_KEY=sk-your-key-here
MODEL_ID=deepseek-chat
```

API Key 从 [DeepSeek 开放平台](https://platform.deepseek.com/) 获取。

### 3. 从第 1 章开始

打开 [ch01-what-is-harness.md](ch01-what-is-harness.md)，跟着图解和代码一步步来。

每章的代码嵌在 Markdown 中，复制到一个 `.py` 文件即可运行。

---

## 学习路径

- **快速体验**（2 小时）：ch01 -> ch02 -> ch03 -> ch09。先知道 Agent 怎么循环、怎么用工具、怎么组装。
- **系统学习**（1 天）：ch01 -> ch10 全部阅读。适合想自己写 Harness 的读者。
- **动手为主**：每章先复制完整代码跑通，再回头读“核心概念”和“逐步拆解”。

如果某章代码没跑通，不要急着跳下一章。先看本章的“常见卡点”，再检查 `.env`、依赖安装、文件路径和终端当前目录。

---

## 前置知识

- Python 基础（变量、函数、字典）
- 会用终端运行命令
- 有 DeepSeek API Key

不需要了解机器学习、不需要读过原课程。

你也不需要一次理解所有 Agent 框架术语。本教程只围绕一个问题展开：

> 模型想做事时，外面的程序要怎样帮它安全、稳定地做完？

---

## 目录结构

```
harness-visual-tutorial/
├── README.md                  # 本文件：教程总览
├── plan.md                    # 设计方案
├── ch01-what-is-harness.md    # 什么是 Harness
├── ch02-agent-loop.md         # Agent 循环
├── ch03-tool-use.md           # 工具调用
├── ch04-permission.md         # 权限系统
├── ch05-memory.md             # 记忆系统
├── ch06-subagent.md           # 子代理
├── ch07-error-handling.md     # 错误处理
├── ch08-context-management.md # 上下文管理
├── ch09-assembly.md           # 完整组装
├── ch10-next-steps.md         # 后续方向
└── images/                    # 28 张 PNG 图解
```
