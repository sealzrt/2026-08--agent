# DeepSeek Harness 源码分析文档

> 源码路径：`/Users/zhangruitao/iss-project/github/deepseek-harness`
> 版本：`0.1.0-rc.5`（开发者预览）

---

## 文档清单

| 文档 | 内容 | 图解 |
|------|------|------|
| [architecture.md](architecture.md) | 项目架构全景：分层设计、目录结构、启动流程、核心模块、包依赖关系 | 3 张 |
| [plugin-system.md](plugin-system.md) | 插件系统详解：Cordis 核心概念、生命周期、通信模式、配置系统、开发指南 | 3 张 |
| [archive-solution.md](archive-solution.md) | **档案馆落地方案**：两条业务流程编排、6 个自定义插件设计、四阶段实施路径 | 4 张 |

## 图解清单（10 张）

| 图片 | 说明 |
|------|------|
| `images/dsh-architecture-overview.png` | 整体五层架构：运行表面 → 核心 → 能力 → 支撑 → 基础设施 |
| `images/dsh-startup-flow.png` | 启动流程：用户输入 → 参数解析 → 配置组合 → Cordis 启动 → 插件挂载 → Agent 运行 |
| `images/dsh-capability-seam.png` | 能力接缝：Service Definition / Provider / Consumer 三角色协作 |
| `images/dsh-plugin-lifecycle.png` | 插件四阶段生命周期：加载 → 初始化 → 运行 → 卸载 |
| `images/dsh-plugin-communication.png` | 三种通信模式：Service 注入 / Event 事件 / Waterfall 瀑布 |
| `images/dsh-package-map.png` | 包依赖关系：核心包 → 能力包 → 支撑包 → 启动集成 |
| `images/archive-architecture.png` | 档案馆 AI Agent 整体架构：用户入口 → Agent → 插件 → 系统集成 |
| `images/archive-receive-workflow.png` | 流程一：档案接收与整理（8 步，含人工审核节点） |
| `images/archive-search-workflow.png` | 流程二：档案检索与利用（7 步，含权限审批分支） |
| `images/archive-plugin-map.png` | 档案馆插件依赖关系：工具集 + 对接插件 + 工作流 + 技能 |

## 快速开始

```bash
# 先看架构全景
open architecture.md

# 再深入插件系统
open plugin-system.md

# 最后看档案馆落地方案
open archive-solution.md
```

## 目录结构

```text
deepseek-harness-docs/
├── README.md
├── architecture.md
├── plugin-system.md
├── archive-solution.md
└── images/
    ├── dsh-architecture-overview.png
    ├── dsh-startup-flow.png
    ├── dsh-capability-seam.png
    ├── dsh-plugin-lifecycle.png
    ├── dsh-plugin-communication.png
    ├── dsh-package-map.png
    ├── archive-architecture.png
    ├── archive-receive-workflow.png
    ├── archive-search-workflow.png
    └── archive-plugin-map.png
```
