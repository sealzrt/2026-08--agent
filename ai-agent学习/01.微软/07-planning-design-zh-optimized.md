# 规划设计模式：目标定义、任务分解与结构化输出

来源：Microsoft Learn 开源课程 [AI Agents for Beginners - Planning Design](https://github.com/microsoft/ai-agents-for-beginners/blob/main/07-planning-design/README.md)

> 本文是对原英文课程的中文整理版，不是逐字翻译。目标是帮助中文读者掌握规划（Planning）设计模式：如何定义总体目标、拆解复杂任务、用结构化输出驱动多 Agent 协作，以及如何做迭代式重规划。

## 1. 这节课要解决什么问题

- 定义清晰的总体目标，把复杂任务拆解为可管理的子任务。
- 利用结构化输出（如 JSON）获得更可靠、机器可读的响应。
- 用事件驱动的方式处理动态任务和意外输入。

学完这一节后，你应该能够：

- 为 AI Agent 设定明确的总体目标，让它清楚知道要达成什么。
- 把复杂任务分解为可管理的子任务，并组织成合理的执行顺序。
- 为 Agent 配备合适的工具（搜索、数据分析等），决定何时、如何使用，并处理过程中的意外情况。
- 评估子任务结果、度量表现，并通过迭代改进最终产出。

## 2. 定义总体目标与任务分解

现实中的大多数任务都太复杂，无法一步完成。Agent 需要一个简明的目标来指引它的规划和行动。

以"生成一份 3 天旅行行程"为例：说起来简单，但仍需细化。目标越清晰，Agent（以及协作的人）就越能聚焦于正确的结果——比如一份包含航班选项、酒店推荐和活动建议的完整行程。

### 2.1 任务分解

把大任务拆成面向目标的小子任务后会更容易处理。旅行行程可以分解为：

- 航班预订
- 酒店预订
- 租车
- 个性化定制

每个子任务可以交给专门的 Agent 或流程处理：一个 Agent 专注找最优航班，另一个负责酒店预订，等等。再由一个协调（"下游"）Agent 把结果汇编成一份完整行程交付给用户。

这种模块化方式也便于渐进增强——例如后续可以增加"美食推荐"或"本地活动建议"的专项 Agent，持续打磨行程质量。

### 2.2 结构化输出

LLM 可以生成结构化输出（如 JSON），便于下游 Agent 或服务解析和处理。这在多 Agent 场景中特别有用：拿到规划输出后就能直接派发执行。

下面的 Python 代码演示一个简单的规划 Agent 把目标分解为子任务并生成结构化计划：

```python
from pydantic import BaseModel
from enum import Enum
from typing import List
import json
import os
from pprint import pprint
from agent_framework.foundry import FoundryChatClient
from azure.identity import AzureCliCredential

class AgentEnum(str, Enum):
    FlightBooking = "flight_booking"
    HotelBooking = "hotel_booking"
    CarRental = "car_rental"
    ActivitiesBooking = "activities_booking"
    DestinationInfo = "destination_info"
    DefaultAgent = "default_agent"
    GroupChatManager = "group_chat_manager"

# 旅行子任务模型
class TravelSubTask(BaseModel):
    task_details: str
    assigned_agent: AgentEnum  # 指定负责该子任务的 Agent

class TravelPlan(BaseModel):
    main_task: str
    subtasks: List[TravelSubTask]
    is_greeting: bool

provider = FoundryChatClient(
    project_endpoint=os.environ["AZURE_AI_PROJECT_ENDPOINT"],
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    credential=AzureCliCredential(),
)

system_prompt = """You are a planner agent.
    Your job is to decide which agents to run based on the user's request.
    Provide your response in JSON format.
    Below are the available agents specialised in different tasks:
    - FlightBooking: For booking flights and providing flight information
    - HotelBooking: For booking hotels and providing hotel information
    - CarRental: For booking cars and providing car rental information
    - ActivitiesBooking: For booking activities and providing activity information
    - DestinationInfo: For providing information about destinations
    - DefaultAgent: For handling general requests"""

user_message = "Create a travel plan for a family of 2 kids from Singapore to Melbourne"

response = client.create_response(input=user_message, instructions=system_prompt)
pprint(json.loads(response.output_text))
```

## 3. 规划 Agent + 多 Agent 编排

设想一个语义路由 Agent 收到用户请求（例如"我需要一份旅行酒店计划"），规划器（Planner）的工作流程是：

1. **接收请求并生成计划**：结合系统提示词（含可用 Agent 的详情），把用户消息转化为一份结构化旅行计划。
2. **列出 Agent 及其工具**：Agent 注册表维护了所有 Agent（航班、酒店、租车、活动等）及其提供的函数/工具。
3. **把计划路由给相应 Agent**：单任务场景直接发给专责 Agent；多任务场景通过群聊管理器（Group Chat Manager）协调多 Agent 协作。
4. **汇总结果**：最后把生成的计划总结清楚，交付给用户。

上面代码运行后的结构化输出示例（可依据 `assigned_agent` 路由子任务，并向最终用户汇总旅行计划）：

```json
{
    "is_greeting": "False",
    "main_task": "Plan a family trip from Singapore to Melbourne.",
    "subtasks": [
        {
            "assigned_agent": "flight_booking",
            "task_details": "Book round-trip flights from Singapore to Melbourne."
        },
        {
            "assigned_agent": "hotel_booking",
            "task_details": "Find family-friendly hotels in Melbourne."
        },
        {
            "assigned_agent": "car_rental",
            "task_details": "Arrange a car rental suitable for a family of four in Melbourne."
        },
        {
            "assigned_agent": "activities_booking",
            "task_details": "List family-friendly activities in Melbourne."
        },
        {
            "assigned_agent": "destination_info",
            "task_details": "Provide information about Melbourne as a travel destination."
        }
    ]
}
```

完整示例 Notebook：[07-python-agent-framework.ipynb](https://github.com/microsoft/ai-agents-for-beginners/blob/main/07-planning-design/code_samples/07-python-agent-framework.ipynb)

## 4. 迭代式规划（Re-planning）

有些任务需要往复调整或重新规划——某个子任务的结果会影响下一步。例如 Agent 在订航班时发现了意外的数据格式，可能需要先调整策略再去订酒店。

用户反馈也会触发部分重规划（例如用户表示想改乘更早的航班）。这种动态、迭代的方式确保最终方案与现实约束和不断变化的用户偏好保持一致。

```python
import os
from agent_framework.foundry import FoundryChatClient
from azure.identity import AzureCliCredential
# …… 与前文相同，另外传入用户历史和当前计划

system_prompt = """You are a planner agent ...（同前）"""

user_message = "Create a travel plan for a family of 2 kids from Singapore to Melbourne"

response = client.create_response(
    input=user_message,
    instructions=system_prompt,
    context=f"Previous travel plan - {TravelPlan}",  # 带上旧计划作为上下文
)
# …… 重新规划，并把任务派发给相应 Agent
```

更完善的规划体系可参考微软的 [Magentic-One](https://www.microsoft.com/research/articles/magentic-one-a-generalist-multi-agent-system-for-solving-complex-tasks)：其编排器（Orchestrator）负责创建针对具体任务的计划、把子任务委派给可用 Agent，同时还有跟踪机制监控任务进度、按需重新规划。

## 5. 小结

本课演示了如何创建一个能动态选择可用 Agent 的规划器：规划器的输出把任务分解并指派给各 Agent 执行（前提是这些 Agent 拥有完成任务所需的函数/工具）。在此基础上还可以叠加其他模式，如反思（Reflection）、总结器（Summarizer）、轮询群聊（Round Robin Chat）等进一步定制。

## 6. 延伸资料

- [Magentic-One：解决复杂任务的通用多 Agent 系统](https://www.microsoft.com/research/articles/magentic-one-a-generalist-multi-agent-system-for-solving-complex-tasks)——在多个高难度 Agentic 基准上取得了出色成绩。

---

- 上一课：[06-构建可信的 AI Agent](06-trustworthy-agents-zh-optimized.md)
- 下一课：[08-多 Agent 设计模式](08-multi-agent-zh-optimized.md)
