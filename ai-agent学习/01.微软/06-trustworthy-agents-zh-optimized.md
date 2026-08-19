# 构建可信的 AI Agent：安全、威胁与人工介入

来源：Microsoft Learn 开源课程 [AI Agents for Beginners - Building Trustworthy AI Agents](https://github.com/microsoft/ai-agents-for-beginners/blob/main/06-building-trustworthy-agents/README.md)

> 本文是对原英文课程的中文整理版，不是逐字翻译。目标是帮助中文读者掌握构建安全可信 Agent 的三大抓手：系统消息框架、威胁认知与缓解、人工介入（Human-in-the-Loop）。

## 1. 这节课要解决什么问题

- 如何构建和部署安全、有效的 AI Agent。
- 开发 AI Agent 时的重要安全考量。
- 如何在开发过程中保护数据和用户隐私。

学完这一节后，你应该能够：

- 识别并缓解创建 AI Agent 时的风险。
- 落实安全措施，确保数据和访问得到妥善管理。
- 创建既保护数据隐私、又有良好用户体验的 Agent。

## 2. 安全性：系统消息框架

"安全"指 AI Agent 按设计意图运行。构建安全 Agent 的第一个抓手是设计健壮的系统提示词（System Prompt / System Message）——它确立了 LLM 与用户和数据交互的元规则、指令和边界。对 Agent 来说系统提示词比普通 LLM 应用更重要，因为 Agent 需要高度具体的指令才能完成设计好的任务。

为了让系统提示词的创建可规模化，可以使用"系统消息框架"，分四步：

### 第 1 步：编写元系统消息（Meta System Message）

元提示词交给 LLM，让它去**生成**各个 Agent 的系统提示词。把它设计成模板，需要时可以高效地批量创建多个 Agent。示例：

```plaintext
You are an expert at creating AI agent assistants.
You will be provided a company name, role, responsibilities and other
information that you will use to provide a system prompt for.
To create the system prompt, be descriptive as possible and provide a structure
that a system using an LLM can better understand the role and responsibilities
of the AI assistant.
```

### 第 2 步：编写基础提示词

用一段话描述这个 Agent：角色、要完成的任务、其他职责。示例：

```plaintext
You are a travel agent for Contoso Travel that is great at booking flights for
customers. To help customers you can perform the following tasks: lookup available
flights, book flights, ask for preferences in seating and times for flights,
cancel any previously booked flights and alert customers on any delays or
cancellations of flights.
```

### 第 3 步：把基础提示词交给 LLM 优化

把元系统消息作为 system message、基础提示词作为输入交给 LLM，就能产出一份结构化程度高得多的正式系统消息。生成结果通常包含：

- **公司名与角色**（Contoso Travel / 旅行助理）
- **目标**：核心使命的清晰陈述
- **关键职责**：航班查询、航班预订、偏好询问、退票处理、航班监控等分项说明
- **语气与风格**：友好、专业、平易近人
- **用户交互指令**：及时准确回复、对话式但保持专业、以客户满意为先
- **附加说明**：跟进航司政策变化、避免行话等

### 第 4 步：迭代改进

这个框架的价值在于：既能规模化地为多个 Agent 生成系统消息，也便于随时间持续改进。系统消息很少能一次到位——通过微调基础提示词、重新走一遍框架流程，你可以对比和评估不同版本的效果。

## 3. 理解威胁

构建可信 Agent 的前提是理解并缓解针对它的风险和威胁。以下是几类典型威胁及其缓解手段：

### 3.1 任务与指令劫持

- **描述**：攻击者通过提示词或操纵输入，试图改变 Agent 的指令或目标。
- **缓解**：在 Agent 处理之前执行校验检查和输入过滤，识别潜在危险提示词。这类攻击通常需要与 Agent 频繁交互，因此**限制对话轮数**也是有效手段。

### 3.2 关键系统访问

- **描述**：如果 Agent 能访问存有敏感数据的系统和服务，攻击者可能破坏 Agent 与这些服务之间的通信，或借 Agent 间接刺探这些系统的信息。
- **缓解**：Agent 对系统的访问遵循**最小必要原则**；Agent 与系统之间的通信必须加密安全；落实身份认证和访问控制。

### 3.3 资源与服务过载

- **描述**：攻击者利用 Agent 调用工具/服务的能力，通过 Agent 向下游服务发送大量请求，导致系统故障或高额费用。
- **缓解**：限制 Agent 对每个服务的请求次数；限制对话轮数和请求量。

### 3.4 知识库投毒

- **描述**：不直接攻击 Agent，而是污染它依赖的知识库或其他服务的数据，导致 Agent 给出有偏或非预期的回答。
- **缓解**：定期校验 Agent 工作流所用的数据；确保数据访问安全、只有可信人员能修改。

### 3.5 级联错误

- **描述**：攻击者引发的错误可能导致 Agent 所连接的其他系统接连失败，使攻击范围扩大且难以排查。
- **缓解**：让 Agent 在受限环境中运行（例如在 Docker 容器内执行任务），避免直接的系统攻击；针对系统报错设计回退机制和重试逻辑，防止更大范围的故障。

## 4. 人工介入（Human-in-the-Loop）

构建可信 Agent 系统的另一个有效手段是引入人工介入：让用户在 Agent 运行过程中提供反馈。用户实际上扮演了多 Agent 系统中的一个"Agent"角色——负责批准或终止正在运行的流程。

用 Microsoft Agent Framework 实现的示意代码：

```python
import os
from agent_framework.foundry import FoundryChatClient
from azure.identity import AzureCliCredential

provider = FoundryChatClient(
    project_endpoint=os.environ["AZURE_AI_PROJECT_ENDPOINT"],
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    credential=AzureCliCredential(),
)

# 生成回复，并要求在定稿前征得用户批准
response = provider.create_response(
    input="Write a 4-line poem about the ocean.",
    instructions="You are a helpful assistant. Ask for user approval before finalizing.",
)

print(response.output_text)
user_input = input("Do you approve? (APPROVE/REJECT): ")
if user_input == "APPROVE":
    print("Response approved.")
else:
    print("Response rejected. Revising...")
```

## 5. 小结

构建可信 AI Agent 需要精心设计、健壮的安全措施和持续迭代：

- 用结构化的元提示词体系规模化生成和优化系统消息。
- 理解潜在威胁并逐一落实缓解策略。
- 引入人工介入，让 Agent 始终与用户需求对齐、把风险降到最低。

随着 AI 演进，对安全、隐私和伦理保持主动姿态，是建立 AI 系统信任与可靠性的关键。

## 6. 示例代码与延伸资料

- [系统消息框架示例 Notebook](https://github.com/microsoft/ai-agents-for-beginners/blob/main/06-building-trustworthy-agents/code_samples/06-system-message-framework.ipynb)
- [人工介入示例 Notebook（动作前审批、风险分级、审计日志）](https://github.com/microsoft/ai-agents-for-beginners/blob/main/06-building-trustworthy-agents/code_samples/06-human-in-the-loop.ipynb)
- [Responsible AI 概览](https://learn.microsoft.com/azure/ai-studio/responsible-use-of-ai-overview)
- [生成式 AI 模型与应用的评估](https://learn.microsoft.com/azure/ai-studio/concepts/evaluation-approach-gen-ai)
- [安全系统消息](https://learn.microsoft.com/azure/ai-services/openai/concepts/system-message)
- [风险评估模板（Microsoft RAI Impact Assessment）](https://blogs.microsoft.com/wp-content/uploads/prod/sites/5/2022/06/Microsoft-RAI-Impact-Assessment-Template.pdf)

---

- 上一课：[05-Agentic RAG](05-agentic-rag-zh-optimized.md)
- 下一课：[07-规划设计模式](07-planning-design-zh-optimized.md)
