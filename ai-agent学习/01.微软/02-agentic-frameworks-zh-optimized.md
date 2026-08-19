# AI Agent 框架探索：MAF 与 Foundry Agent Service

来源：Microsoft Learn 开源课程 [AI Agents for Beginners - Exploring AI Agent Frameworks](https://github.com/microsoft/ai-agents-for-beginners/blob/main/02-explore-agentic-frameworks/README.md)

> 本文是对原英文课程的中文整理版，不是逐字翻译。目标是帮助中文读者理解 AI Agent 框架的价值、快速原型方法，以及微软两套 Agent 技术方案的定位差异。

## 1. 这节课要解决什么问题

- AI Agent 框架是什么？它能帮开发者做到什么？
- 团队如何用框架快速做原型、迭代和增强 Agent 能力？
- 微软的两套方案——Microsoft Agent Framework（MAF）和 Microsoft Foundry Agent Service——有什么区别？
- 已有的 Azure 生态工具能不能直接接入？

学完这一节后，你应该能够：

- 说清楚 Agent 框架在 AI 开发中扮演的角色。
- 利用框架的模块化组件快速搭建智能 Agent。
- 根据场景在 MAF 和 Foundry Agent Service 之间做选型。

## 2. 什么是 AI Agent 框架

AI Agent 框架是一类软件平台，用来简化 AI Agent 的创建、部署和管理。它为开发者提供预置组件、抽象层和工具链，让开发者不必重复解决通用问题，而是专注于自己应用的独特部分。

### 2.1 先看传统 AI 框架能做什么

传统 AI 框架帮助你把 AI 集成进应用，典型收益包括：

- **个性化**：分析用户行为和偏好，提供个性化推荐。例如 Netflix 根据观看历史推荐影片。
- **自动化与效率**：自动处理重复任务、简化流程。例如客服系统用 AI 聊天机器人处理常见咨询，把人力留给复杂问题。
- **体验增强**：语音识别、自然语言处理、预测输入等智能特性。例如 Siri、Google Assistant。

### 2.2 那为什么还需要"Agent 框架"

Agent 框架比传统 AI 框架更进一步：它的目标是创建能与用户、其他 Agent 以及环境交互的智能体，这些智能体可以自主行动、做决策、适应变化。Agent 框架带来的关键能力有三个：

- **多 Agent 协作与协调**：让多个 Agent 一起工作、通信、分工，解决复杂任务。
- **任务自动化与管理**：支持多步骤工作流的自动化、任务分派和动态任务管理。
- **上下文理解与适应**：让 Agent 能理解上下文、适应环境变化，并基于实时信息做决策。

一句话总结：Agent 框架把自动化提升到新的层级，让系统能够根据环境自我调整和学习。

## 3. 如何快速做原型和迭代

尽管这个领域变化很快，但大多数 Agent 框架都提供三类共通的能力，可以直接利用：

### 3.1 使用模块化组件

像 MAF 这样的 SDK 提供了预置组件：AI 连接器、工具定义、Agent 管理等。团队可以直接拼装这些组件，不必从零开始，从而快速实验和迭代。

一个用 MAF + `FoundryChatClient` 实现"带工具调用的订票 Agent"的例子：

```python
import asyncio
import os

from agent_framework import tool
from agent_framework.foundry import FoundryChatClient
from azure.identity import AzureCliCredential


# 定义一个订票工具函数
@tool(approval_mode="never_require")
def book_flight(date: str, location: str) -> str:
    """Book travel given location and date."""
    return f"Travel was booked to {location} on {date}"


async def main():
    provider = FoundryChatClient(
        project_endpoint=os.environ["AZURE_AI_PROJECT_ENDPOINT"],
        model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
        credential=AzureCliCredential(),
    )
    agent = provider.as_agent(
        name="travel_agent",
        instructions="Help the user book travel. Use the book_flight tool when ready.",
        tools=[book_flight],
    )

    response = await agent.run("I'd like to go to New York on January 1, 2025")
    print(response)
    # 输出示例：Your flight to New York on January 1, 2025, has been successfully booked.


if __name__ == "__main__":
    asyncio.run(main())
```

要点：框架自动完成了"从用户输入中提取目的地和日期 → 决定调用工具 → 组织回复"的全过程，开发者只需要关注高层逻辑。

### 3.2 利用协作能力

框架支持创建多个各有分工的 Agent 并让它们配合工作。典型做法是：每个 Agent 负责一个专门职能（数据检索、分析、决策等），彼此传递信息，共同完成目标。

```python
import os
from agent_framework.foundry import FoundryChatClient
from azure.identity import AzureCliCredential

provider = FoundryChatClient(
    project_endpoint=os.environ["AZURE_AI_PROJECT_ENDPOINT"],
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    credential=AzureCliCredential(),
)

# 数据检索 Agent
agent_retrieve = provider.as_agent(
    name="dataretrieval",
    instructions="Retrieve relevant data using available tools.",
    tools=[retrieve_tool],
)

# 数据分析 Agent
agent_analyze = provider.as_agent(
    name="dataanalysis",
    instructions="Analyze the retrieved data and provide insights.",
    tools=[analyze_tool],
)

# 按顺序执行：先检索，再分析
retrieval_result = await agent_retrieve.run("Retrieve sales data for Q4")
analysis_result = await agent_analyze.run(f"Analyze this data: {retrieval_result}")
print(analysis_result)
```

通过给每个 Agent 设定专门角色，可以提升任务效率和执行质量。

### 3.3 实时学习

更进一步的框架支持实时的上下文理解与调整。做法是建立反馈闭环：Agent 分析用户反馈、环境数据和任务结果，据此更新知识、调整决策逻辑，实现持续改进。

## 4. 微软的两套方案对比

### 4.1 Microsoft Agent Framework（MAF）

MAF 是一个精简的 Agent 开发 SDK，核心入口是 `FoundryChatClient`。它面向"构建"环节，提供工具调用、会话管理，并通过 Azure Identity 实现企业级安全认证。

核心概念：

- **Agent**：通过 `FoundryChatClient` 创建，配置名称、指令（instructions）和工具。Agent 可以处理用户消息、根据上下文自动调用工具、在多轮交互中维持会话状态。

    ```python
    provider = FoundryChatClient(
        project_endpoint=os.environ["AZURE_AI_PROJECT_ENDPOINT"],
        model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
        credential=AzureCliCredential(),
    )
    agent = provider.as_agent(
        name="my_agent",
        instructions="You are a helpful assistant.",
    )
    response = await agent.run("Hello, World!")
    ```

- **工具（Tools）**：直接把 Python 函数注册为工具，Agent 会自动决定何时调用。

    ```python
    def get_weather(location: str) -> str:
        """Get the current weather for a location."""
        return f"The weather in {location} is sunny, 72°F."

    agent = provider.as_agent(
        name="weather_agent",
        instructions="Help users check the weather.",
        tools=[get_weather],
    )
    ```

- **多 Agent 协调**：创建不同专长的 Agent 并编排它们的工作，例如"规划 Agent + 执行 Agent"的组合。

- **Azure Identity 集成**：使用 `AzureCliCredential` 或 `DefaultAzureCredential` 做免密钥认证，不需要手工管理 API Key。

**适用场景**：构建生产级 AI Agent，涉及工具调用、多步骤工作流和企业集成。

### 4.2 Microsoft Foundry Agent Service

Foundry Agent Service 是 2024 年 Microsoft Ignite 上发布的平台级服务，定位在"部署与运行"环节。特点：

- 模型选择更灵活，可直接调用 Llama 3、Mistral、Cohere 等开源大模型。
- 提供更强的企业级安全机制和数据存储方式。
- 与 MAF 开箱即用地配合：用 MAF 构建，用 Agent Service 部署。
- 内置连接 Azure OpenAI、Azure AI Search、Bing Search、代码执行等服务。

核心概念：

- **Agent**：在 Foundry 中，Agent 相当于一个"智能微服务"，可用于问答（RAG）、执行操作或完全自动化工作流。

    ```python
    agent = project_client.agents.create_agent(
        model="gpt-5-mini",
        name="my-agent",
        instructions="You are helpful agent",
        tools=code_interpreter.definitions,
        tool_resources=code_interpreter.resources,
    )
    ```

- **线程与消息（Thread & Messages）**：线程代表一次 Agent 与用户的对话，用于跟踪对话进度、存储上下文、管理交互状态。消息可以是文本、图片或文件等多种类型。

    ```python
    thread = project_client.agents.create_thread()
    message = project_client.agents.create_message(
        thread_id=thread.id,
        role="user",
        content="请根据以下数据生成营业利润柱状图……",
    )
    run = project_client.agents.create_and_process_run(thread_id=thread.id, agent_id=agent.id)
    messages = project_client.agents.list_messages(thread_id=thread.id)
    ```

**适用场景**：需要安全、可扩展、灵活部署 AI Agent 的企业级应用。

### 4.3 到底怎么选

| 方案 | 定位 | 核心概念 | 适用场景 |
| --- | --- | --- | --- |
| Microsoft Agent Framework | 精简的 Agent 构建 SDK，内置工具调用 | Agent、工具、Azure Identity | 构建 Agent、工具调用、多步骤工作流 |
| Microsoft Foundry Agent Service | 灵活模型、企业安全、代码执行的平台服务 | 模块化、协作、流程编排 | 安全、可扩展的企业级 Agent 部署 |

几个常见问题：

- **我要快速开始构建生产级 Agent 应用** → 选 MAF，几行代码就能定义带工具的 Agent。
- **我需要企业级部署，要用 Azure Search、代码执行等集成能力** → 选 Foundry Agent Service，可以在 Foundry Portal 里构建并规模化部署。
- **还是纠结，给我一个答案** → 先用 MAF 构建 Agent，需要生产部署和扩容时再上 Foundry Agent Service。这样既能快速迭代 Agent 逻辑，又有清晰的企业部署路径。

## 5. 能否直接接入已有的 Azure 生态

可以。Foundry Agent Service 天然与其他 Azure 服务打通，例如 Bing、Azure AI Search、Azure Functions，并与 Microsoft Foundry 深度集成。MAF 也可以通过 `FoundryChatClient` 和 Azure Identity 在工具函数中直接调用 Azure 服务。

## 6. 延伸资料

- [Azure AI Agent Service 发布博客](https://techcommunity.microsoft.com/blog/azure-ai-services-blog/introducing-azure-ai-agent-service/4298357)
- [Microsoft Agent Framework - Azure OpenAI Responses](https://learn.microsoft.com/azure/ai-services/openai/how-to/responses)
- [Microsoft Foundry Agent Service 概览](https://learn.microsoft.com/azure/ai-services/agents/overview)

---

- 上一课：[01-AI Agent 入门](01-ai-agents-intro-zh-optimized.md)
- 下一课：[03-Agentic 设计原则](03-agentic-design-patterns-zh-optimized.md)
