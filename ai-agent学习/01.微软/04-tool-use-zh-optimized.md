# 工具使用设计模式：让 Agent 拥有行动能力

来源：Microsoft Learn 开源课程 [AI Agents for Beginners - Tool Use Design Pattern](https://github.com/microsoft/ai-agents-for-beginners/blob/main/04-tool-use/README.md)

> 本文是对原英文课程的中文整理版，不是逐字翻译。目标是帮助中文读者理解工具使用（Tool Use）设计模式的原理、实现要素和安全注意事项。

## 1. 这节课要解决什么问题

工具的意义在于：它极大拓展了 Agent 的能力边界。没有工具的 Agent 只能执行有限的动作；接入工具后，Agent 可以执行范围广泛得多的操作。

这节课回答四个问题：

- 什么是工具使用设计模式？
- 它适用于哪些场景？
- 实现这个模式需要哪些组成要素？
- 用这个模式构建可信 AI Agent 时有哪些特殊注意事项？

## 2. 什么是工具使用设计模式

**工具使用设计模式**的核心：让 LLM 具备与外部工具交互的能力，从而达成特定目标。

- 工具（Tool）就是可以被 Agent 执行的代码。
- 可以简单到一个计算器函数，也可以是第三方服务的 API 调用（股价查询、天气预报等）。
- 在 Agent 语境下，工具由 Agent 响应**模型生成的函数调用（function call）**而执行。

## 3. 典型应用场景

工具使用模式常见于需要与外部系统（数据库、Web 服务、代码解释器等）动态交互的场景：

- **动态信息检索**：查询外部 API 或数据库获取最新数据，例如查 SQLite 做数据分析、获取股价或天气。
- **代码执行与解释**：执行代码或脚本来解数学题、生成报告、做仿真。
- **工作流自动化**：集成任务调度器、邮件服务、数据管道，自动化重复性或多步骤流程。
- **客户支持**：对接 CRM、工单平台、知识库来解决用户问题。
- **内容生成与编辑**：调用语法检查、文本摘要、内容安全评估等工具辅助内容创作。

## 4. 实现这个模式需要哪些要素

- **函数/工具 Schema**：对可用工具的详细定义，包括函数名、用途、必需参数、预期输出。LLM 靠这些 Schema 了解有哪些工具、如何构造合法请求。
- **函数执行逻辑**：决定何时、如何根据用户意图和对话上下文调用工具，可能包含规划模块、路由机制或条件流。
- **消息处理系统**：管理用户输入、LLM 回复、工具调用、工具输出之间的会话流转。
- **工具集成框架**：把 Agent 与各种工具（简单函数或复杂外部服务）连接起来的基础设施。
- **错误处理与校验**：处理工具执行失败、校验参数、应对意外响应。
- **状态管理**：跟踪对话上下文、历史工具交互和持久化数据，保证多轮交互的一致性。

## 5. 核心机制：Function/Tool Calling

Function Calling 是让 LLM 与工具交互的主要方式。"Function"和"Tool"经常混用，因为"函数"（可复用的代码块）就是 Agent 用来执行任务的"工具"。

完整流程是：

1. 把包含所有可用函数描述的 Schema 发给 LLM。
2. LLM 将用户请求与函数描述比对，选出最合适的函数，返回**函数名和参数**（注意：返回的是"工具调用"，不是最终答案）。
3. 你的代码执行被选中的函数。
4. 函数结果送回 LLM，LLM 据此生成对用户的最终回复。

开发者实现 Function Calling 需要三样东西：

1. 一个支持 Function Calling 的 LLM 模型（不是所有模型都支持，需要确认）。
2. 一份包含函数描述的 Schema。
3. 每个函数对应的实现代码。

### 5.1 完整示例：查询某城市当前时间

**第一步：初始化支持 Function Calling 的客户端**（Azure OpenAI Responses API，稳定的 `/openai/v1/` 端点，无需 `api_version`）：

```python
client = OpenAI(
    base_url=f"{os.environ['AZURE_OPENAI_ENDPOINT'].rstrip('/')}/openai/v1/",
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
)
deployment_name = os.environ["AZURE_OPENAI_DEPLOYMENT"]
```

**第二步：定义函数 Schema 并发起第一次调用**：

```python
# 供模型阅读的函数描述（Responses API 扁平工具格式）
tools = [
    {
        "type": "function",
        "name": "get_current_time",
        "description": "Get the current time in a given location",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "The city name, e.g. San Francisco",
                },
            },
            "required": ["location"],
        },
    }
]

messages = [{"role": "user", "content": "What's the current time in San Francisco"}]

# 第一次 API 调用：让模型决定是否调用函数
response = client.responses.create(
    model=deployment_name,
    input=messages,
    tools=tools,
    tool_choice="auto",
    store=False,
)

# Responses API 把工具调用作为 function_call 项放在 response.output 中
messages += response.output
```

模型返回的是工具调用请求：

```text
[ResponseFunctionToolCall(arguments='{"location":"San Francisco"}',
 call_id='call_pOsK...', name='get_current_time', type='function_call')]
```

**第三步：执行函数并把结果回传给模型**：

```python
def get_current_time(location):
    """Get the current time for a given location"""
    location_lower = location.lower()
    for key, timezone in TIMEZONE_DATA.items():
        if key in location_lower:
            current_time = datetime.now(ZoneInfo(timezone)).strftime("%I:%M %p")
            return json.dumps({"location": location, "current_time": current_time})
    return json.dumps({"location": location, "current_time": "unknown"})


# 处理工具调用
tool_calls = [item for item in response.output if item.type == "function_call"]
for tool_call in tool_calls:
    if tool_call.name == "get_current_time":
        function_args = json.loads(tool_call.arguments)
        time_response = get_current_time(location=function_args.get("location"))
        # 把工具结果作为 function_call_output 追加进对话
        messages.append({
            "type": "function_call_output",
            "call_id": tool_call.call_id,
            "output": time_response,
        })

# 第二次 API 调用：让模型生成最终回复
final_response = client.responses.create(
    model=deployment_name,
    input=messages,
    tools=tools,
    store=False,
)
print(final_response.output_text)
# 输出：The current time in San Francisco is 09:24 AM.
```

Function Calling 是几乎所有 Agent 工具使用设计的核心，但从零实现比较繁琐——这正是 Agent 框架的价值所在。

## 6. 用框架实现工具使用

### 6.1 Microsoft Agent Framework

MAF 用 `@tool` 装饰器把 Python 函数直接变成工具，框架自动完成函数序列化、Schema 生成，以及模型与代码之间的往返通信。还可以通过 `FoundryChatClient` 使用 File Search、Code Interpreter 等预置工具。

```python
import os
from agent_framework import tool
from agent_framework.foundry import FoundryChatClient
from azure.identity import AzureCliCredential

@tool(approval_mode="never_require")
def get_current_time(location: str) -> str:
    """Get the current time for a given location"""
    ...

provider = FoundryChatClient(
    project_endpoint=os.environ["AZURE_AI_PROJECT_ENDPOINT"],
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    credential=AzureCliCredential(),
)

agent = provider.as_agent(
    name="TimeAgent",
    instructions="Use available tools to answer questions.",
    tools=get_current_time,
)
response = await agent.run("What time is it?")
```

### 6.2 Microsoft Foundry Agent Service

相比直接调用 LLM API，Foundry Agent Service 的优势：

- **自动工具调用**：解析工具调用、执行工具、处理响应全部在服务端完成。
- **安全托管的数据**：用线程（Thread）保存会话状态，不需要自己管理。
- **开箱即用的工具**：直接对接 Bing、Azure AI Search、Azure Functions 等数据源。

服务内的工具分两类：

1. **知识类工具**：Bing Search 落地检索、File Search、Azure AI Search。
2. **动作类工具**：Function Calling、Code Interpreter、OpenAPI 定义的工具、Azure Functions。

这些工具可以组合成一个 `toolset`（工具集）使用；`threads` 则负责记录一次对话的消息历史。

例如一个销售数据分析 Agent：LLM 会根据用户请求，自主决定是调用用户自定义的 SQL 查询函数，还是使用预置的 Code Interpreter：

```python
import os
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential
from fetch_sales_data_functions import fetch_sales_data_using_sqlite_query
from azure.ai.projects.models import ToolSet, FunctionTool, CodeInterpreterTool

project_client = AIProjectClient.from_connection_string(
    credential=DefaultAzureCredential(),
    conn_str=os.environ["PROJECT_CONNECTION_STRING"],
)

# 组装工具集：自定义 SQL 查询函数 + Code Interpreter
toolset = ToolSet()
toolset.add(FunctionTool(fetch_sales_data_using_sqlite_query))
toolset.add(CodeInterpreterTool())

agent = project_client.agents.create_agent(
    model="gpt-5-mini",
    name="my-agent",
    instructions="You are helpful agent",
    toolset=toolset,
)
```

## 7. 可信性方面的特殊考虑

LLM 动态生成 SQL 的常见安全顾虑是 SQL 注入和恶意操作（删库、篡改数据）。这些顾虑是合理的，但可以通过正确配置数据库访问权限有效缓解：

- 大多数场景下，把数据库配置为**只读**。
- 对 PostgreSQL、Azure SQL 这类数据库服务，给应用分配只读（SELECT）角色。

在安全环境中运行应用可进一步增强防护。企业场景的最佳实践是：把数据从业务系统抽取、转换到一个只读的数据库或数据仓库（并配上易用的 Schema）。这样既保证数据安全、性能和可访问性，又限定应用只有只读权限。

## 8. 示例代码与延伸资料

- Python：[Agent Framework 示例](https://github.com/microsoft/ai-agents-for-beginners/blob/main/04-tool-use/code_samples/04-python-agent-framework.ipynb)
- .NET：[Agent Framework 示例](https://github.com/microsoft/ai-agents-for-beginners/blob/main/04-tool-use/code_samples/04-dotnet-agent-framework.md)
- [Azure AI Agents Service Workshop](https://microsoft.github.io/build-your-first-agent-with-azure-ai-agent-service-workshop/)
- [Contoso Creative Writer 多 Agent Workshop](https://github.com/Azure-Samples/contoso-creative-writer/tree/main/docs/workshop)

---

- 上一课：[03-Agentic 设计原则](03-agentic-design-patterns-zh-optimized.md)
- 下一课：[05-Agentic RAG](05-agentic-rag-zh-optimized.md)
