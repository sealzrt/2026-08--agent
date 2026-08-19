# 计算机使用 Agent（CUA）：像人一样操作浏览器

来源：Microsoft Learn 开源课程 [AI Agents for Beginners - Building Computer Use Agents (CUA)](https://github.com/microsoft/ai-agents-for-beginners/blob/main/15-browser-use/README.md)

> 本文是对原英文课程的中文整理版，不是逐字翻译。目标是帮助中文读者理解 CUA 的适用场景、Agent/Actor 模式的取舍、浏览器 Agent 的安全护栏，以及企业级 CUA（Project Opal）的实践参考。

## 1. 这节课要解决什么问题

计算机使用 Agent（Computer Use Agent, CUA）能像人一样与网站交互：打开浏览器、观察页面、根据所见采取下一步最佳行动。本课动手构建一个浏览器自动化 Agent：搜索 Airbnb、抽取结构化房源数据、找出斯德哥尔摩最便宜的住宿。

技术组合：**Browser-Use**（AI 驱动的导航）+ **Playwright / Chrome DevTools Protocol（CDP）**（浏览器控制）+ **Azure OpenAI**（具备视觉能力的推理）+ **Pydantic**（结构化抽取）。

学完你将能够：

- 判断什么时候 CUA 比纯 API 自动化更合适
- 结合 Browser-Use 与 Playwright/CDP 做可靠的浏览器生命周期管理
- 用 Azure OpenAI 视觉 + Pydantic 结构化输出，从动态网页抽取房源数据
- 根据浏览器任务的可预测程度，在 Agent 优先、Actor 优先、混合三种工作流中做选择

## 2. 环境准备

前置条件：Python 3.12+、已配置的 Azure OpenAI 部署、本地安装 Chrome/Chromium、Playwright 依赖、基本的 async Python 知识。

```bash
pip install browser_use playwright python-dotenv
playwright install chromium
```

环境变量：

```bash
AZURE_OPENAI_ENDPOINT=...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_CHAT_DEPLOYMENT_NAME=...
# 可选：省略时默认用最新 API 版本
AZURE_OPENAI_API_VERSION=...
```

配套 notebook：`15-browser-user.ipynb`——通过 CDP 启动 Chrome 会话、搜索 Airbnb 斯德哥尔摩房源、用 Browser-Use 视觉能力抽取价格、以结构化数据返回最便宜的选项。

## 3. 架构总览：混合式浏览器自动化

notebook 演示的混合工作流分四步：

1. **共享会话**：以启用 CDP 的方式启动 Chrome，让 Playwright 和 Browser-Use 共享同一个浏览器会话。
2. **Agent 处理开放式导航**：Browser-Use Agent 负责打开 Airbnb、关闭弹窗、搜索斯德哥尔摩等灵活任务。
3. **结构化抽取**：用 Pydantic schema 检视当前页面，抽取房源标题、每晚价格、评分、URL。
4. **业务逻辑**：Python 代码比较抽取到的房源，标出最便宜的结果。

这种方式既保留了 Browser-Use 擅长的、基于视觉的灵活推理，又在需要时提供确定性的浏览器控制。

## 4. Agent vs Actor：怎么选

| 场景 | 用 Agent（AI 驱动） | 用 Actor（脚本直控） |
|------|-----|-----|
| 动态布局 | ✅ AI 能适应页面变化 | ❌ 脆弱的选择器容易失效 |
| 已知结构 | ❌ Agent 比直接控制慢 | ✅ 快速且精确 |
| 查找元素 | ✅ 自然语言描述即可 | ❌ 需要精确的选择器 |
| 时序控制 | ❌ 可预测性差 | ✅ 完全掌控等待与重试 |
| 复杂工作流 | ✅ 能处理意外的 UI 状态 | ❌ 需要显式写分支逻辑 |

### Browser-Use 最佳实践

1. 探索和动态导航阶段先用 Agent。
2. 交互变得可预测后切换到直接页面控制（Actor）。
3. 用结构化输出模型（Pydantic），让抽取的数据经过校验、类型安全。
4. 在触发可见 UI 变化的动作之后策略性地加延时。
5. 迭代过程中截图，方便排查失败。
6. 预期网站会变化——为弹窗和布局变动设计兜底策略。
7. 混用 Agent 与 Actor 模式，兼得灵活性与精确性。

## 5. 浏览器 Agent 的安全护栏

浏览器 Agent 操作的是真实网站，需要比"只调已知 API 的脚本"更严格的边界。从 notebook 演示走向真实工作流之前，先定义 Agent 能看、能点、能提交什么：

1. **限定浏览环境**：在专用浏览器配置或沙箱中运行 Agent，只允许访问任务所需的域名。
2. **观察与行动分离**：让 Agent 先搜索、阅读、抽取数据；在提交表单、发消息、订行程、付款、删记录、改账户设置之前，必须有显式的人工批准环节。
3. **密钥不进 prompt 和 trace**：密码、支付信息、会话 cookie、原始个人数据不放进模型上下文。认证环节交还用户操作，日志中脱敏敏感字段。
4. **把页面内容当不可信输入**：网页可能包含"写给 Agent 看"的指令（注入攻击）。Agent 应忽略页面上要求它改变目标、泄露数据、关闭防护、访问无关网站的文本。
5. **高风险步骤前做确定性检查**：在请求用户批准最后一步之前，用代码核验当前 URL、页面标题、选中项、价格、收件人和动作摘要。
6. **设预算和停止条件**：限定动作次数、重试次数、标签页数量、运行时长。页面状态不明确时停下来，而不是继续点。
7. **记录有用的证据而非一切**：保留动作摘要、时间戳、URL、选中元素描述、截图引用，便于复盘失败，同时不存储不必要的敏感页面内容。

在 Airbnb 示例中，安全的默认行为是搜索房源和抽取价格；登录、联系房东、完成预订应是单独的、经用户批准的动作。

### 真实应用场景

- 旅行预订与价格监控
- 电商比价与库存检查
- 从动态网站做结构化抽取
- 视觉感知的 UI 测试与验证
- 网站监控与告警
- 多步骤流程的智能表单填写

## 6. 企业级参考：Microsoft Project Opal

本课构建的是一个小型、本地版的 CUA。微软把同样的理念带入企业：**Project Opal（Frontier）**，Microsoft 365 Copilot 中的一项能力。

用 Project Opal，你描述一个任务，Agent 就在安全的 Windows 365 Cloud PC 上代表你通过"计算机使用"完成工作——操作组织内基于浏览器的应用、站点和数据。它在后台异步工作，你可以随时指导或接管。示例工作：

- 管理安全组成员申请
- 为合规审查收集和校验审计证据
- IT 事件分诊（更新工单状态、指派负责人、关闭重复项）
- 把 Excel 数据汇编成财务结算演示稿

Opal 是"生产级、可信赖 CUA 长什么样"的有用参照，它印证了本课程前面多节课的概念：

| 课程概念 | Project Opal 的应用 |
|---------|---------------------|
| 人在环中（第 6 课） | 遇到登录凭据、敏感数据或指令不明时暂停；未经显式确认绝不输入密码或提交表单；任务中可随时 Take Control / Return Control |
| 可信与安全 Agent（第 6、18 课） | 运行在隔离的 Windows 365 Cloud PC；默认仅限浏览器（其他计算机访问被 Intune 强制阻断）；使用你的身份，只能访问你有权限的资源；每个动作都有日志可审计 |
| 规划与元认知（第 7、9 课） | 先为任务生成计划，每一步监督自己的推理，发现可疑活动就暂停 |
| 可复用能力/工具（第 4 课） | Skills 让你为可重复的工作编写指令（从 .md 导入或用 Opal 编写），跨会话复用 |

> 可用性：Project Opal 目前面向 Frontier 早期访问计划中持有 Microsoft 365 Copilot 订阅的用户，需要管理员完成设置。作为实验性 Frontier 功能，能力可能随时间变化。

## 7. 小结

CUA 的核心取舍是 **Agent（灵活但慢）vs Actor（快但脆）**，实战答案通常是混合：Agent 探路、Actor 收口、Pydantic 保证数据质量。上生产前，安全护栏（环境隔离、观察/行动分离、页面内容不可信、预算与停止条件）比功能本身更重要。

## 8. 延伸资料

- [Project Opal（Frontier）入门](https://support.microsoft.com/topic/get-started-with-project-opal-frontier-preview)
- [Browser-Use Playwright 集成模板](https://docs.browser-use.com/)
- [Microsoft Foundry Discord 社区](https://discord.com/invite/ATgtXmAS5D)

---

- 上一课：[14-Microsoft Agent Framework 探索](14-microsoft-agent-framework-zh-optimized.md)
- 下一课：[16-部署可扩展的 Agent](16-deploying-scalable-agents-zh-optimized.md)
