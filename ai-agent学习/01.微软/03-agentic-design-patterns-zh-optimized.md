# Agentic 设计原则：以人为本的 Agent 体验设计

来源：Microsoft Learn 开源课程 [AI Agents for Beginners - AI Agentic Design Principles](https://github.com/microsoft/ai-agents-for-beginners/blob/main/03-agentic-design-patterns/README.md)

> 本文是对原英文课程的中文整理版，不是逐字翻译。目标是帮助中文读者理解一套"以人为本"的 Agent 体验设计原则，以及如何在实际产品中落地这些原则。

## 1. 这节课要解决什么问题

生成式 AI 的设计中，"模糊性"是特性而不是缺陷——这也让工程师常常不知道从哪里入手。这节课给出一套以人为本的 UX 设计原则，帮助团队设计出以客户为中心的 Agent 系统。

注意：这套原则**不是一个强制性的架构规范**，而是团队定义和构建 Agent 体验时的出发点。

总的来说，一个好的 Agent 应该：

- 扩展和放大人的能力（头脑风暴、解决问题、自动化等）。
- 填补知识空白（快速了解陌生领域、翻译等）。
- 按照每个人偏好的协作方式来支持协作。
- 让我们成为更好的自己（例如生活教练、任务管理，帮助学习情绪调节和正念技巧，培养韧性等）。

学完这一节后，你应该能够：

- 说清楚 Agentic 设计原则是什么。
- 掌握实施这些设计原则时的落地准则。
- 理解如何按这些原则去构建一个 Agent。

## 2. 三组设计原则

这套原则从三个维度展开：空间（Space）、时间（Time）、核心（Core）。

### 2.1 Agent 与空间：Agent 在哪里工作

空间指 Agent 所处的运行环境，这组原则关注 Agent 如何介入物理世界和数字世界。

- **连接，而不是取代**（Connecting, not collapsing）
  - Agent 的价值在于把人与人、事件、可操作的知识连接起来，促进协作。
  - Agent 拉近人与人的距离，它的定位不是替代人或贬低人。
- **易于触达，但适时隐身**（Easily accessible yet occasionally invisible）
  - Agent 大部分时间在后台运行，只在相关且合适的时机提醒用户。
  - 授权用户在任何设备、任何平台上都能方便地发现和使用 Agent。
  - 支持多模态输入输出（声音、语音、文本等）。
  - 能根据对用户需求的感知，在前台/后台、主动/被动之间无缝切换。
  - Agent 可以以"不可见"的形式工作，但它在后台的处理路径、与其他 Agent 的协作，对用户必须是透明且可控的。

### 2.2 Agent 与时间：Agent 如何跨越过去、现在与未来

- **过去：基于状态与上下文的历史反思**
  - 不只看单个事件、人或状态，而是分析更丰富的历史数据，给出更相关的结果。
  - 从过去的事件中建立关联，主动"回忆"来应对当前情境。
- **现在：轻推（Nudge）而不只是通知（Notify）**
  - 事件发生时，Agent 不应停留在静态通知，而是简化流程、动态生成提示，在正确的时机引导用户注意力。
  - 根据情境环境、社会文化变化和用户意图来传递信息。
  - 交互可以循序渐进，随着时间推移逐步增加复杂度，长期赋能用户。
- **未来：适应与演化**
  - 适配不同设备、平台和模态。
  - 适应用户行为和无障碍需求，支持自由定制。
  - 通过持续的用户交互不断塑造和进化。

### 2.3 Agent 的核心：不确定性与信任

- **拥抱不确定性，但建立信任**
  - Agent 存在一定程度的不确定性是正常的——不确定性本身就是 Agent 设计的关键要素。
  - 信任和透明是 Agent 设计的基础层。
  - 人始终掌握 Agent 的开关控制权，且 Agent 的状态必须随时清晰可见。

## 3. 三条落地准则

应用上述原则时，遵循以下三条准则：

1. **透明（Transparency）**：告知用户 AI 的参与情况、它如何工作（包括历史行为），以及如何反馈和修改系统。
2. **控制（Control）**：允许用户自定义、设置偏好、个性化，对系统及其属性拥有控制权（包括"被遗忘"的能力，即删除数据）。
3. **一致（Consistency）**：在各设备、各端提供一致的多模态体验；尽量使用用户熟悉的 UI/UX 元素（例如语音交互用麦克风图标），并尽可能降低认知负担（简洁回答、可视化辅助、"了解更多"式的分层内容）。

## 4. 实例：按这套原则设计一个旅行 Agent

假设你要设计一个旅行 Agent，可以这样应用原则和准则：

1. **透明**
   - 明确告知用户这是一个 AI 驱动的 Agent。
   - 提供基本的上手引导（欢迎消息、示例提示词），并在产品页面清晰说明。
   - 展示用户过去问过的提示词列表。
   - 提供清晰的反馈入口（点赞/点踩、发送反馈按钮等）。
   - 明确说明 Agent 的使用限制或话题限制。
2. **控制**
   - 让用户清楚知道创建后如何修改 Agent，例如调整 System Prompt。
   - 允许用户选择 Agent 的详略程度、写作风格，以及不希望谈论的话题。
   - 允许用户查看和删除关联的文件、数据、提示词和历史对话。
3. **一致**
   - 分享提示词、添加文件/照片、@某人等操作使用标准且易识别的图标。
   - 用回形针图标表示文件上传/共享，用图片图标表示图像上传。

## 5. 示例代码

- Python：[Agent Framework 示例](https://github.com/microsoft/ai-agents-for-beginners/blob/main/03-agentic-design-patterns/code_samples/03-python-agent-framework.ipynb)
- .NET：[Agent Framework 示例](https://github.com/microsoft/ai-agents-for-beginners/blob/main/03-agentic-design-patterns/code_samples/03-dotnet-agent-framework.md)

## 6. 延伸资料

- [Practices for Governing Agentic AI Systems | OpenAI](https://openai.com)
- [The HAX Toolkit Project - Microsoft Research](https://microsoft.com)
- [Responsible AI Toolbox](https://responsibleaitoolbox.ai)

---

- 上一课：[02-AI Agent 框架探索](02-agentic-frameworks-zh-optimized.md)
- 下一课：[04-工具使用设计模式](04-tool-use-zh-optimized.md)
