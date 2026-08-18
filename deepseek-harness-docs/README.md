# DeepSeek Harness 源码分析文档

> 源码路径：`/Users/zhangruitao/iss-project/github/deepseek-harness`
> 版本：`0.1.0-rc.5`（开发者预览）

---

## 文档清单

| 文档 | 内容 | 图解 |
|------|------|------|
| [00-business-quickstart.md](00-business-quickstart.md) | **业务落地快速入门**：用浅显方式理解 dsh 适合什么场景、怎么做 MVP、如何学习 | 1 张 |
| [01-business-landing-map.md](01-business-landing-map.md) | **业务落地地图**：把业务需求映射成入口、工具、插件、流程、人工确认和审计 | 1 张 |
| [02-build-first-business-agent.md](02-build-first-business-agent.md) | **第一个业务 Agent 实战**：用客户工单分派助手练习 MVP 拆解、工具设计和验收 | 4 张 |
| [03-mvp-delivery-playbook.md](03-mvp-delivery-playbook.md) | **MVP 交付手册**：按 4 周节奏推进业务 Agent 试点，明确交付物、验收和风险 | 0 张 |
| [04-business-agent-patterns.md](04-business-agent-patterns.md) | **业务 Agent 落地模式库**：用 8 种常见模式快速判断业务场景该怎么套 dsh | 2 张 |
| [05-business-case-library.md](05-business-case-library.md) | **业务 Agent 案例库**：用 8 个业务案例练习 MVP 边界、工具清单、确认点和验收标准 | 1 张 |
| [06-from-mvp-to-production.md](06-from-mvp-to-production.md) | **从 MVP 到生产试点**：解释影子运行、权限、审计、验收、灰度、回退和持续运营 | 2 张 |
| [07-business-tool-design.md](07-business-tool-design.md) | **业务 Tool 设计指南**：把业务动作拆成安全、可确认、可审计、可验收的 Agent 工具 | 2 张 |
| [08-business-workflow-design.md](08-business-workflow-design.md) | **业务 Workflow 设计指南**：把多步骤业务流程拆成主流程、分支、确认、失败处理和状态流转 | 4 张 |
| [09-business-plugin-profile-design.md](09-business-plugin-profile-design.md) | **业务 Plugin / Profile 设计指南**：理解业务能力怎么打包成插件，并用 Profile 控制不同启动边界 | 3 张 |
| [10-business-evaluation-testing.md](10-business-evaluation-testing.md) | **业务 Agent 测试与验收指南**：用样例集、评分表、影子运行和 Go/No-Go 判断 Agent 是否可试点 | 2 张 |
| [11-concept-cheatsheet.md](11-concept-cheatsheet.md) | **概念速查与术语辨析**：区分 Agent、Tool、Workflow、Plugin、Profile、Context、Memory、State 等概念 | 3 张 |
| [12-business-agent-workbook.md](12-business-agent-workbook.md) | **业务 Agent 实战练习册**：把场景拆解、流程、工具、样例、验收串成一条实操路径 | 0 张 |
| [13-business-confirmation-ui.html](13-business-confirmation-ui.html) | **业务 Agent 用户确认页**：只展示最终用户需要看到的输入、建议、确认按钮、进度和结果 | 0 张 |
| [14-business-reviewer-ui.html](14-business-reviewer-ui.html) | **业务 Agent 审核员页**：展示审核员需要看到的分类、风险、审计和确认链路 | 0 张 |
| [architecture.md](architecture.md) | 项目架构全景：分层设计、目录结构、启动流程、核心模块、包依赖关系 | 4 张 |
| [plugin-system.md](plugin-system.md) | 插件系统详解：Cordis 核心概念、生命周期、通信模式、配置系统、开发指南 | 3 张 |
| [archive-solution.md](archive-solution.md) | **档案馆落地方案**：两条业务流程编排、6 个自定义插件设计、四阶段实施路径 | 4 张 |

## 建议阅读路径

如果目标是“快速熟悉 dsh，并判断能不能业务落地”，按这个顺序读：

1. 先读 [00-business-quickstart.md](00-business-quickstart.md)：先判断 dsh 适合什么业务场景，以及 MVP 怎么做。
2. 再读 [01-business-landing-map.md](01-business-landing-map.md)：学习如何把业务需求拆成入口、工具、流程、人工确认和审计。
3. 再读 [02-build-first-business-agent.md](02-build-first-business-agent.md)：用一个轻量业务场景练习 MVP 拆解。
4. 再读 [03-mvp-delivery-playbook.md](03-mvp-delivery-playbook.md)：学习如何组织一次业务 Agent MVP 试点。
5. 再读 [04-business-agent-patterns.md](04-business-agent-patterns.md)：学习常见业务 Agent 模式，判断场景该用只读、确认、流程、批处理还是审计优先。
6. 再读 [05-business-case-library.md](05-business-case-library.md)：从客服、档案、运维、合同、财务、OA 等案例里找可迁移的模板。
7. 再读 [06-from-mvp-to-production.md](06-from-mvp-to-production.md)：学习试点上线前要补哪些生产边界。
8. 再读 [07-business-tool-design.md](07-business-tool-design.md)：学习怎么把业务动作设计成 Agent 可调用的工具。
9. 再读 [08-business-workflow-design.md](08-business-workflow-design.md)：学习怎么把多个工具、分支、确认点和失败处理串成业务流程。
10. 再读 [09-business-plugin-profile-design.md](09-business-plugin-profile-design.md)：学习业务 Tool、Workflow、规则和系统对接怎么打包成 Plugin，并通过 Profile 控制启动边界。
11. 再读 [10-business-evaluation-testing.md](10-business-evaluation-testing.md)：学习怎么构造验收样例、做影子运行、沉淀回归测试，并判断是否进入试点。
12. 再读 [11-concept-cheatsheet.md](11-concept-cheatsheet.md)：遇到术语混淆时，回到这篇确认各概念的层次和关系。
13. 再读 [12-business-agent-workbook.md](12-business-agent-workbook.md)：把前面的内容串成一条完整的实战练习路径。
14. 再读 [archive-solution.md](archive-solution.md)：看一个更完整的业务场景如何从架构概念落到插件、工作流、系统集成和上线计划。
15. 再读 [architecture.md](architecture.md)：建立五层架构、启动流程、Agent 循环和包依赖的整体印象。
16. 最后读 [plugin-system.md](plugin-system.md)：理解为什么 dsh 的能力都通过插件、服务和生命周期管理扩展。

如果目标是“评估能不能做档案馆项目”，可以反过来读：先看档案馆方案，再回到插件系统和架构文档确认每个设计点靠什么机制支撑。

## 源码核对范围

本轮已对照以下源码位置修正文档中的命令、配置层和 SDK 示例：

| 核对点 | 源码位置 |
|--------|----------|
| 版本、Node 要求、workspace 范围 | `package.json`、`pnpm-workspace.yaml` |
| CLI 入口、`web` alias、`plugin` 命令、`--patch` | `apps/cli/src/bin.ts`、`apps/cli/src/args.ts` |
| profile patch 叠加顺序 | `apps/cli/src/profile-boot.ts` |
| web/headless profile 行为 | `packages/bundle/web-app/`、`packages/bundle/headless/` |
| dsh 扩展元数据 | 各包 `package.json` 中的 `dsh.bundle`、`dsh.client` |
| Python SDK 推荐用法 | `python/sdk/README.md`、`python/sdk/src/deepseek_harness/` |

档案馆落地方案中的业务插件、字段和流程属于方案设计建议，不是源码中已有的内置插件。

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
# 进入文档目录
cd deepseek-harness-docs

# 先看业务落地快速入门
open 00-business-quickstart.md

# 再看业务落地地图
open 01-business-landing-map.md

# 做第一个业务 Agent 练习
open 02-build-first-business-agent.md

# 学习如何推进 MVP 试点
open 03-mvp-delivery-playbook.md

# 查看常见业务 Agent 落地模式
open 04-business-agent-patterns.md

# 从案例里找业务迁移模板
open 05-business-case-library.md

# 学习如何从 MVP 推进到生产试点
open 06-from-mvp-to-production.md

# 学习业务 Tool 怎么设计
open 07-business-tool-design.md

# 学习业务 Workflow 怎么设计
open 08-business-workflow-design.md

# 学习业务 Plugin / Profile 怎么设计
open 09-business-plugin-profile-design.md

# 学习业务 Agent 怎么测试和验收
open 10-business-evaluation-testing.md

# 查阅概念和术语关系
open 11-concept-cheatsheet.md

# 做完整的业务 Agent 实战练习
open 12-business-agent-workbook.md

# 然后看档案馆落地方案
open archive-solution.md

# 最后回到架构和插件机制
open architecture.md
open plugin-system.md
```

如果想先直观看人工确认 UI，先看 [13-business-confirmation-ui.html](13-business-confirmation-ui.html)（用户页），再看 [14-business-reviewer-ui.html](14-business-reviewer-ui.html)（审核员页）。

这些文档是源码阅读和方案设计笔记，适合建立概念模型、讨论技术路线和拆解落地计划；具体 API 名称、包版本和命令参数仍建议以实际源码为准。

## 目录结构

```text
deepseek-harness-docs/
├── README.md
├── 00-business-quickstart.md
├── 01-business-landing-map.md
├── 02-build-first-business-agent.md
├── 03-mvp-delivery-playbook.md
├── 04-business-agent-patterns.md
├── 05-business-case-library.md
├── 06-from-mvp-to-production.md
├── 07-business-tool-design.md
├── 08-business-workflow-design.md
├── 09-business-plugin-profile-design.md
├── 10-business-evaluation-testing.md
├── 11-concept-cheatsheet.md
├── 12-business-agent-workbook.md
├── 13-business-confirmation-ui.html
├── 14-business-reviewer-ui.html
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
