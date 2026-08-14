# Claude Code Book 易学版

> 基于《御舆：解码 Agent Harness · Claude Code 架构深度剖析》的易学化整理。

本目录不是重新设计一门 Harness 课程，也不是原课程的压缩摘要。它的目标是保留原课程的大纲、章节顺序和技术内容，同时给每章增加导读、概念拆解、学习检查点和通用 Harness 视角，降低阅读高密度架构内容时的理解成本。

原课程入口：<https://lintsinghua.github.io/#preface>

## 学习目标

完成本整理版后，你应该能够：

1. 沿着原课程主线理解 Claude Code 的 Agent Harness 架构。
2. 解释对话循环、工具系统、权限管线、配置、记忆、上下文、Hooks、Subagent、Skills、MCP、Plan 模式等核心机制。
3. 区分 Claude Code 的具体实现和通用 Agent Harness 的设计原则。
4. 将课程中的架构思想迁移到自己的 Agent Harness 设计中。

## 怎么使用

推荐学习节奏：

1. 先读 [00-preface.md](00-preface.md)，明确这门课到底在学什么。
2. 再读 [appendices/source-mapping.md](appendices/source-mapping.md)，知道整理版与原课程章节如何对应。
3. 学每章前先看整理版导读，再回到原课程阅读正文。
4. 遇到术语不清楚时查 [appendices/glossary.md](appendices/glossary.md)。
5. 每章结束后用“学完检查点”确认自己是否真正理解。

## 内容组织

```text
claude-code-book-easy/
├── README.md
├── plan.md
├── 00-preface.md
├── part-1-foundation/          # 第 1-4 章：基础篇
├── part-2-core-architecture/   # 第 5-8 章：核心系统篇
├── part-3-advanced-systems/    # 第 9-12 章：高级模式篇
├── part-4-engineering-practice/# 第 13-15 章：工程实践篇
└── appendices/
    ├── source-mapping.md
    ├── glossary.md
    └── enrichment-priority.md
```

## 整理原则

- 保留原课程大纲，不重新编排主线。
- 不逐字复制原课程正文。
- 不删除复杂机制，只把它们拆成更易理解的层次。
- 每章都先回答“为什么需要这个机制”，再解释“它如何工作”。
- 每章都区分 Claude Code 具体机制和通用 Harness 原则。

## 当前状态

第一阶段先产出学习框架：

- [plan.md](plan.md)：整理方案
- [00-preface.md](00-preface.md)：前言导读
- [appendices/source-mapping.md](appendices/source-mapping.md)：原课程章节映射
- [appendices/glossary.md](appendices/glossary.md)：核心术语表
- [appendices/enrichment-priority.md](appendices/enrichment-priority.md)：后续加厚优先级清单

后续再按原课程章节逐章补充易学版导读和拆解。
