# Microsoft Agent Framework 深入：核心概念与高级模式

来源：Microsoft Learn 开源课程 [AI Agents for Beginners - Exploring Microsoft Agent Framework](https://github.com/microsoft/ai-agents-for-beginners/blob/main/14-microsoft-agent-framework/README.md)

> 本文是对原英文课程的中文整理版，不是逐字翻译。目标是帮助中文读者系统掌握 MAF 的核心概念（Agent/线程/中间件/记忆/可观测性）、Workflow 工作流组件，以及 LangGraph Agent 托管到 Foundry 等高级用法。

## 1. 这节课要解决什么问题

本课覆盖三块内容：

- 理解 Microsoft Agent Framework（MAF）：关键特性与价值
- 探索 MAF 的核心概念
- MAF 高级模式：Workflow、中间件与记忆

学完你将能够：用 MAF 构建生产级 AI Agent；把 MAF 核心特性应用到自己的 Agent 场景；使用 Workflow、中间件、可观测性等高级模式。

> 代码示例位于原仓库的 `xx-python-agent-framework` 和 `xx-dotnet-agent-framework` 文件中。

## 2. MAF 概览

MAF 是微软构建 AI Agent 的统一框架，灵活覆盖生产与研究环境中的各种 Agent 编排场景：

- **顺序编排（Sequential）**：需要逐步执行的工作流。
- **并发编排（Concurrent）**：多个 Agent 同时执行任务。
- **群聊编排（Group Chat）**：多个 Agent 围绕一个任务协作。
- **交接编排（Handoff）**：子任务完成后 Agent 之间移交任务。
- **磁力编排（Magnetic）**：由一个管理者 Agent 创建和调整任务清单，协调子 Agent 完成任务。

面向生产交付的特性：

- **可观测性**：基于 OpenTelemetry，覆盖工具调用、编排步骤、推理流程，并可通过 Microsoft Foundry 仪表盘做性能监控。
- **安全**：Agent 原生托管在 Microsoft Foundry 上，享有基于角色的访问控制、私有数据处理、内置内容安全。
- **持久性**：Agent 线程和工作流可暂停、恢复、从错误中恢复，支撑长时间运行的流程。
- **可控性**：支持人在环中（HITL）工作流，任务可标记为需要人工审批。

互操作性设计：

- **云无关**：Agent 可以跑在容器、本地机房、多云环境。
- **供应商无关**：可通过 Azure OpenAI、OpenAI 等偏好的 SDK 创建 Agent。
- **拥抱开放标准**：支持 A2A、MCP 等协议来发现和使用其他 Agent 与工具。
- **插件与连接器**：可连接 Microsoft Fabric、SharePoint、Pinecone、Qdrant 等数据与记忆服务。

## 3. 核心概念一：Agent

### 3.1 创建 Agent

创建 Agent 需要三要素：推理服务（LLM 供应商）、指令（instructions）、名字：

```python
# 用 Azure OpenAI 创建
agent = AzureOpenAIChatClient(credential=AzureCliCredential()).create_agent(
    instructions="You are good at recommending trips to customers based on their preferences.",
    name="TripRecommender"
)

# 用 Microsoft Foundry Agent Service 创建
agent = AzureAIAgentClient(async_credential=credential).create_agent(
    name="HelperAgent",
    instructions="You are a helpful assistant."
)

# 用 OpenAI Responses / ChatCompletion API 创建
agent = OpenAIResponsesClient().create_agent(name="WeatherBot", instructions="...")
agent = OpenAIChatClient().create_agent(name="HelpfulAssistant", instructions="...")

# 用 A2A 协议接入远程 Agent
agent = A2AAgent(
    name=agent_card.name,
    description=agent_card.description,
    agent_card=agent_card,
    url="https://your-a2a-agent-host"
)
```

任何 OpenAI 兼容 API 都能接入（如 MiniMax，上下文窗口最大 204K token），只需指定 `base_url`、`api_key`、`model_id`。

### 3.2 运行 Agent

用 `.run`（非流式）或 `.run_stream`（流式）：

```python
result = await agent.run("What are good places to visit in Amsterdam?")
print(result.text)

async for update in agent.run_stream("What are the good places to visit in Amsterdam?"):
    if update.text:
        print(update.text, end="", flush=True)
```

每次运行还可以定制参数：max_tokens、可调用的工具，甚至本次运行所用的模型——适合特定任务需要特定模型/工具的场景。

### 3.3 工具（Tools）

工具既可以在**定义 Agent 时**挂载，也可以在**运行时**临时提供：

```python
def get_attractions(
    location: Annotated[str, Field(description="The location to get the top tourist attractions for")],
) -> str:
    """Get the top tourist attractions for a given location."""
    return f"The top attractions for {location} are..."

# 定义时挂载
agent = ChatAgent(
    chat_client=OpenAIChatClient(),
    instructions="You are a helpful assistant",
    tools=[get_attractions]
)

# 运行时临时提供（仅本次运行有效）
result = await agent.run("What's the best place to visit in Seattle?", tools=[get_attractions])
```

### 3.4 Agent 线程（Threads）

线程用于处理多轮对话，两种方式：

- `get_new_thread()`：显式创建，线程可长期保存；
- 运行 Agent 时自动创建，仅本次运行期间存在。

线程可以序列化存储、之后反序列化恢复——这是实现"会话可续"的关键：

```python
thread = agent.get_new_thread()
response = await agent.run("Hello, how are you?", thread=thread)

# 序列化保存
serialized_thread = await thread.serialize()
# 从存储加载后恢复
resumed_thread = await agent.deserialize_thread(serialized_thread)
```

### 3.5 中间件（Middleware）

Agent 与工具、LLM 交互的"中间环节"可以插入执行或跟踪逻辑：

**Function Middleware**——在 Agent 与它要调用的函数/工具之间执行动作（典型用途：函数调用日志）。`next` 决定是继续下一个中间件还是执行真正的函数：

```python
async def logging_function_middleware(
    context: FunctionInvocationContext,
    next: Callable[[FunctionInvocationContext], Awaitable[None]],
) -> None:
    print(f"[Function] Calling {context.function.name}")   # 前置处理
    await next(context)                                     # 继续执行
    print(f"[Function] {context.function.name} completed")  # 后置处理
```

**Chat Middleware**——在 Agent 与 LLM 请求之间执行动作，可以拿到发给 AI 服务的消息等重要信息：

```python
async def logging_chat_middleware(
    context: ChatContext,
    next: Callable[[ChatContext], Awaitable[None]],
) -> None:
    print(f"[Chat] Sending {len(context.messages)} messages to AI")
    await next(context)
    print("[Chat] AI response received")
```

### 3.6 记忆（Memory）

MAF 提供多种记忆形态（详见[第 13 课](13-agent-memory-zh-optimized.md)）：

- **内存存储（In-Memory）**：应用运行期间存在线程里的记忆。
- **持久消息（Persistent Messages）**：跨会话存储对话历史，通过 `chat_message_store_factory` 定义：

```python
from agent_framework import ChatMessageStore

def create_message_store():
    return ChatMessageStore()

agent = ChatAgent(
    chat_client=OpenAIChatClient(),
    instructions="You are a Travel assistant.",
    chat_message_store_factory=create_message_store
)
```

- **动态记忆（Dynamic Memory）**：Agent 运行前注入上下文的记忆，可存储在 mem0 等外部服务：

```python
from agent_framework.mem0 import Mem0Provider

memory_provider = Mem0Provider(
    api_key="your-mem0-api-key",
    user_id="user_123",
    application_id="my_app"
)

agent = ChatAgent(
    chat_client=OpenAIChatClient(),
    instructions="You are a helpful assistant with memory.",
    context_providers=memory_provider
)
```

### 3.7 可观测性（Observability）

MAF 集成 OpenTelemetry 提供追踪和指标：

```python
from agent_framework.observability import get_tracer, get_meter

tracer = get_tracer()
meter = get_meter()

with tracer.start_as_current_span("my_custom_span"):
    pass  # 自定义追踪

counter = meter.create_counter("my_custom_counter")
counter.add(1, {"key": "value"})
```

## 4. 核心概念二：Workflow（工作流）

Workflow 是预定义的任务步骤，AI Agent 作为其中的组件。Workflow 提供更好的控制流，支持多 Agent 编排和检查点（checkpointing，保存工作流状态）。核心组件：

### 4.1 Executor（执行器）

接收输入消息 → 执行分配的任务 → 产出输出消息，推动工作流向最终目标前进。Executor 可以是 AI Agent，也可以是自定义逻辑。

### 4.2 Edge（边）

定义工作流中消息的流向：

| 边类型 | 说明 | 示例 |
|--------|------|------|
| **Direct（直连边）** | 执行器之间简单的一对一连接 | 见下方代码 |
| **Conditional（条件边）** | 满足条件后激活 | 酒店无房时，执行器建议其他选项 |
| **Switch-case（分支边）** | 按条件把消息路由到不同执行器 | 优先客户的任务走另一条工作流 |
| **Fan-out（扇出边）** | 一条消息发给多个目标 | 并行处理 |
| **Fan-in（扇入边）** | 收集多个执行器的消息汇入一个目标 | 结果汇总 |

```python
from agent_framework import WorkflowBuilder

builder = WorkflowBuilder()
builder.add_edge(source_executor, target_executor)
builder.set_start_executor(source_executor)
workflow = builder.build()
```

### 4.3 Event（事件）

为工作流提供可观测性的内置事件：

- `WorkflowStartedEvent`：工作流开始执行
- `WorkflowOutputEvent`：工作流产出结果
- `WorkflowErrorEvent`：工作流遇到错误
- `ExecutorInvokeEvent` / `ExecutorCompleteEvent`：执行器开始/完成处理
- `RequestInfoEvent`：发出请求

## 5. 高级模式

- **中间件组合**：串联多个中间件处理器（日志、鉴权、限流），对 Agent 行为做细粒度控制。
- **工作流检查点**：利用工作流事件和序列化保存/恢复长时间运行的 Agent 流程。
- **动态工具选择**：把"工具描述 RAG"与 MAF 的工具注册结合，每次查询只呈现相关工具（呼应[第 12 课](12-context-engineering-zh-optimized.md)的"上下文混乱"对策）。
- **多 Agent 交接**：用工作流的边和条件路由编排专业 Agent 之间的交接。

## 6. 在 Foundry 托管 LangChain / LangGraph Agent

MAF 是框架互操作的——不限于 MAF 写的 Agent。已有 LangChain/LangGraph Agent 可以作为 Microsoft Foundry 托管 Agent 运行：Foundry 负责运行时、会话、扩缩容、身份和协议端点，Agent 逻辑仍留在 LangGraph。核心是 `langchain_azure_ai.agents.hosting` 包，它把编译好的 LangGraph 图暴露为 Foundry 托管 Agent 的标准协议。

**步骤 1**：安装 hosting 扩展（附带 Foundry 协议库：`azure-ai-agentserver-responses` 提供 OpenAI 兼容的 `/responses` 端点、`azure-ai-agentserver-invocations` 提供通用 `/invocations` 端点）：

```bash
pip install -U "langchain-azure-ai[hosting]>=1.2.4" azure-identity
```

**步骤 2**：选择托管协议：

| 协议 | Host 类 | 端点 | 适用场景 |
|------|---------|------|---------|
| Responses | `ResponsesHostServer` | `/responses` | OpenAI 兼容对话、流式、响应历史、会话串联——对话型 Agent 的推荐默认 |
| Invocations | `InvocationsHostServer` | `/invocations` | 自定义 JSON 格式、webhook 风格端点、非对话式处理 |

**步骤 3**：配置环境变量（先 `az login` 让 `DefaultAzureCredential` 能认证；部署为托管 Agent 后 `FOUNDRY_PROJECT_ENDPOINT` 由平台自动注入）：

```bash
export FOUNDRY_PROJECT_ENDPOINT="https://<resource>.services.ai.azure.com/api/projects/<project>"
export FOUNDRY_MODEL_NAME="gpt-5-mini"
```

**步骤 4**：把 LangGraph Agent 暴露为 Responses 协议服务：

```python
import os
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from langchain.agents import create_agent
from langchain_openai import ChatOpenAI
from langchain_azure_ai.agents.hosting import ResponsesHostServer

_AZURE_AI_SCOPE = "https://ai.azure.com/.default"

def build_chat_model() -> ChatOpenAI:
    project_endpoint = os.environ["FOUNDRY_PROJECT_ENDPOINT"].rstrip("/")
    deployment = os.environ.get("FOUNDRY_MODEL_NAME", "gpt-5-mini")
    credential = DefaultAzureCredential()
    project = AIProjectClient(endpoint=project_endpoint, credential=credential)
    openai_client = project.get_openai_client()
    token_provider = get_bearer_token_provider(credential, _AZURE_AI_SCOPE)
    # ChatOpenAI 指向 Foundry 项目的 OpenAI 兼容（Responses）端点
    return ChatOpenAI(model=deployment, base_url=str(openai_client.base_url), api_key=token_provider)

def main() -> None:
    graph = create_agent(build_chat_model(), tools=[])
    port = int(os.environ.get("PORT", "8088"))
    ResponsesHostServer(graph).run(port=port)

if __name__ == "__main__":
    main()
```

本地 `python main.py` 启动后，向 `http://localhost:8088/responses` 发送 Responses 请求即可。

**关键行为**：

- **会话**：客户端通过 `previous_response_id` 或会话 ID 续接对话。如果 LangGraph 图编译时带了 checkpointer，Foundry 会把会话状态关联到检查点（生产环境用持久 checkpointer；本地测试用 `MemorySaver` 即可）。
- **人在环中**：图里用了 LangGraph `interrupt()` 时，`ResponsesHostServer` 会把挂起的中断呈现为 Responses 的 `function_call` / `mcp_approval_request` 项，客户端用对应的 `function_call_output` / `mcp_approval_response` 恢复执行。
- **部署到 Foundry**：使用 Azure Developer CLI——`azd ext install azure.ai.agents` → `azd ai agent init -m <manifest>` → `azd ai agent run`（本地需 Docker）→ `azd provision` → `azd deploy`。部署托管 Agent 需要 Foundry Project Manager 角色。

可运行版本见原仓库 `code-samples/14-langchain-hosted-agent.py`。

## 7. 小结

MAF 提供了从单 Agent（创建/运行/工具/线程/中间件/记忆/可观测性）到多 Agent 工作流（Executor + 五种 Edge + 内置 Event）的完整积木，加上五种编排模式和面向生产的持久性/安全/HITL 能力；同时保持开放——云无关、供应商无关、支持 MCP/A2A，甚至可以直接托管 LangGraph Agent。

## 8. 延伸资料

- [Microsoft Agent Framework 文档](https://learn.microsoft.com/agent-framework/)
- [Microsoft Foundry Discord 社区](https://discord.com/invite/ATgtXmAS5D)

---

- 上一课：[13-Agent 记忆](13-agent-memory-zh-optimized.md)
- 下一课：[15-构建计算机使用 Agent（CUA）](15-browser-use-zh-optimized.md)
