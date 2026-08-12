# 第 9 章：智能体框架——选型与使用

> 📖 路径标注：🟢 深入路径  
> ⏱ 预计阅读：30 分钟 | 动手实践：20 分钟

## 9.0 本章导读

前面 8 章，我们手写代码构建了智能体的核心功能。但当你要构建一个**生产级**的智能体时，手写所有东西太低效了。

框架就是**别人帮你写好的"脚手架"**——你只需要在上面搭建你的业务逻辑。

### 学完本章你将能做什么？
- [ ] 能根据需求选择合适的框架
- [ ] 能用 LangChain 构建带工具、记忆的智能体
- [ ] 能用 LangGraph 编排复杂的多步骤流程

---

## 9.1-9.2 为什么需要框架 & 选型对比

### 框架帮你做什么？

| 手写代码 | 用框架 |
|---------|--------|
| 自己管理对话历史 | 内置 Memory 模块 |
| 自己写工具调用循环 | 内置 Agent Executor |
| 自己处理错误重试 | 内置重试和容错 |
| 自己实现流式输出 | 内置 Streaming |

### 主流框架对比

| 维度 | LangChain | LangGraph | AutoGen | CrewAI |
|------|-----------|-----------|---------|--------|
| 定位 | 通用 LLM 工具链 | 状态图编排 | 多智能体对话 | 角色化多智能体 |
| 学习曲线 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| 单 Agent | ✅ 强 | ✅ 强 | ⚠️ 偏弱 | ⚠️ 偏弱 |
| 多 Agent | ⚠️ 基础 | ✅ 强 | ✅ 强 | ✅ 强 |
| 生产就绪 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| 社区活跃度 | 最高 | 高 | 高 | 中 |

**选择建议**：单 Agent 应用选 LangChain+LangGraph；多 Agent 协作选 AutoGen 或 CrewAI。

---

## 9.3 LangChain 核心机制

### 四大组件

```python
# --- 导入 LangChain 四大组件 ---
from langchain_openai import ChatOpenAI                                # LLM 封装
from langchain.agents import tool, AgentExecutor, create_tool_calling_agent  # 工具+智能体
from langchain.memory import ConversationBufferMemory                   # 对话记忆
from langchain_core.prompts import ChatPromptTemplate                  # 提示词模板
import os

# --- 1. LLM：使用 DeepSeek，通过 OpenAI 兼容接口调用 ---
llm = ChatOpenAI(
    model="deepseek-chat",                     # DeepSeek 对话模型
    base_url="https://api.deepseek.com",       # DeepSeek API 地址
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    temperature=0,                             # 确定性输出
)

# --- 2. 工具：用 @tool 装饰器快速定义 ---
@tool
def get_weather(city: str) -> str:
    """查询城市天气"""              # docstring 会成为工具描述，LLM 据此判断何时调用
    return f"{city}: 25°C, 晴"       # 实际项目中这里调用真实天气 API

tools = [get_weather]                 # 工具列表，可以注册多个

# --- 3. 提示模板：定义 system 消息和用户输入的格式 ---
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是旅行助手。"),
    ("human", "{input}"),                          # 用户输入占位符
    ("placeholder", "{agent_scratchpad}"),          # Agent 思考过程的占位符
])

# --- 4. 创建 Agent + 执行器 ---
agent = create_tool_calling_agent(llm, tools, prompt)  # 将 LLM、工具、模板组合成 Agent
executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,             # 开启详细日志，可以看到 Agent 的思考过程
)

# --- 运行测试 ---
result = executor.invoke({"input": "北京今天天气怎么样？"})
```

---

## 9.4 LangGraph 状态图编排

### 为什么需要状态图？

LangChain 的 AgentExecutor 是"一条线"执行。但复杂任务需要**条件分支**：

```
用户问题
  ├── 需要查天气 → 调用天气工具 → 返回结果
  ├── 需要规划行程 → 调用规划工具 → 整合结果
  └── 简单聊天 → 直接回复
```

LangGraph 用"节点+边"来描述这种流程：

```python
# --- 导入 LangGraph ---
from langgraph.graph import StateGraph, END    # 状态图构建器 + 结束节点
from typing import TypedDict, Annotated
import operator
from helpers import decide_action, execute_tool  # 共享辅助函数

# --- 定义状态类型 ---
class AgentState(TypedDict):
    messages: Annotated[list, operator.add]    # 消息列表，每次追加而非覆盖
    next_action: str                           # 下一步动作："tool" / "respond" / "end"

# --- 定义节点函数：每个节点负责一个步骤 ---
def think(state: AgentState) -> AgentState:
    """思考节点：LLM 分析当前状态，决定下一步行动"""
    response = llm.invoke(state["messages"])
    action = decide_action(response)           # 根据 LLM 输出判断：调用工具 or 直接回复
    return {"messages": [response], "next_action": action}

def use_tool(state: AgentState) -> AgentState:
    """工具节点：执行工具调用，返回工具结果"""
    result = execute_tool(state["messages"][-1])
    return {"messages": [result], "next_action": "think"}  # 工具执行完后回到思考节点

def respond(state: AgentState) -> AgentState:
    """回复节点：生成最终回复，准备结束"""
    return {"messages": state["messages"], "next_action": "end"}

# --- 构建状态图：用节点+边描述执行流程 ---
graph = StateGraph(AgentState)            # 创建空图
graph.add_node("think", think)            # 添加思考节点
graph.add_node("tool", use_tool)          # 添加工具节点
graph.add_node("respond", respond)        # 添加回复节点
graph.set_entry_point("think")            # 设置入口：从思考节点开始

# 添加条件边：根据 think 的输出决定走哪条路
graph.add_conditional_edges(
    "think",
    lambda s: s["next_action"],           # 路由函数：读取状态中的 next_action
    {"tool": "tool", "respond": "respond"}  # 映射：next_action 值 → 目标节点
)
graph.add_edge("tool", "think")           # 工具执行完 → 回到思考节点（形成循环）
graph.add_edge("respond", END)            # 回复完成 → 结束

# --- 编译并运行 ---
app = graph.compile()                     # 编译状态图，生成可执行的应用
```

### 旅行助手 v0.5

用 LangGraph 重构旅行助手，实现条件分支：天气查询走一条路径，行程规划走另一条。

---

## 动手实践

### 🎯 用 LangGraph 构建带条件的旅行助手

实现三个节点：`planner`（规划）→ `executor`（执行工具）→ `summarizer`（整合结果）

### 🚧 常见坑
**坑 #1：状态图死循环**
- 现象：`think → tool → think → tool → ...` 无限循环
- 解决：设置 `recursion_limit` 或在 `think` 节点中加入退出条件

---

## 本章小结

### ⚠️ 还缺什么？
框架让我们高效使用现有工具，但你真的理解框架内部是怎么工作的吗？第 10 章将从零构建一个 Agent 框架。

### ➡️ 下一章
第 10 章：从零构建 Agent 框架——理解框架内部的设计原理。

---

## 参考文献
- LangChain: https://python.langchain.com
- LangGraph: https://langchain-ai.github.io/langgraph
- AutoGen: https://microsoft.github.io/autogen
