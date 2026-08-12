# 第 4 章：工具调用 —— 让 LLM 与世界交互

> 📖 路径标注：🟢 深入路径必读  
> ⏱ 预计阅读：20 分钟 | 动手实践：15 分钟

---

## 4.0 本章导读

### 这一章解决什么问题？

上一章我们发现了 LLM 的三个局限。其中最"致命"的一个是：**LLM 无法获取实时信息**。

你问它"北京今天多少度？"，它只能编一个答案。你让它"帮我查一下明天上海到北京的机票"，它无能为力。

这就像一个博学但被关在房间里的助手——知识丰富，但出不去。

**工具调用（Tool Calling）** 就是给这个助手一部手机，让它能打电话问别人、上网查资料、操作外部系统。

### 前置知识

- ✅ 第 3 章 —— 你需要知道 LLM 的 API 调用方式

### 学完本章你将能做什么？

- [ ] 能解释 Function Calling 的完整流程
- [ ] 能定义和注册自定义工具
- [ ] 能为旅行助手添加天气查询和酒店搜索工具
- [ ] 能识别和处理工具调用的常见错误

---

## 4.1 为什么 LLM 需要工具？

### LLM 的三大边界

| 边界 | 含义 | 例子 |
|------|------|------|
| **知识边界** | 训练数据有截止日期，不知道最新信息 | 不知道今天的新闻 |
| **计算边界** | 无法做精确数学运算 | 257×389 可能算错 |
| **行动边界** | 只能生成文本，无法操作外部系统 | 无法发邮件、订酒店 |

工具调用的核心思想：**让 LLM 判断"什么时候需要什么工具"，然后由程序去执行工具，再把结果返回给 LLM。**

> 💡 **类比**：你有一个很聪明但足不出户的朋友。你给他一部手机，让他能打电话问天气预报、查航班信息。他自己还是不出门，但他能通过电话获取外界信息。

---

## 4.2 Function Calling 机制

### 完整流程

```
用户："北京今天多少度？"
   ↓
┌──────────────────────┐
│  LLM 分析：           │
│  "这个问题需要实时天气" │
│  → 决定调用工具：       │
│    get_weather(       │
│      city="北京"      │
│    )                  │
└──────────┬───────────┘
           ↓ （LLM 返回的是"调用请求"，不是最终答案）
┌──────────────────────┐
│  你的程序执行工具：      │
│  调用天气 API           │
│  返回："北京，25°C，晴" │
└──────────┬───────────┘
           ↓ （把工具结果返回给 LLM）
┌──────────────────────┐
│  LLM 整合：           │
│  "北京今天 25°C，晴天， │
│   适合户外活动"        │
└──────────────────────┘
           ↓
最终回复给用户
```

关键点：**LLM 不执行工具，它只说"我想调用这个工具，参数是这些"。你的程序负责实际执行。**

---

## 4.3 工具的定义与注册

### 定义一个工具

每个工具需要三样东西：
1. **名称**：工具叫什么（如 `get_weather`）
2. **描述**：工具做什么（告诉 LLM 什么时候该用它）
3. **参数**：需要什么输入（JSON Schema）

```python
# 定义一个工具的 JSON Schema，包含名称、描述、参数
weather_tool = {
    "type": "function",                # 固定值，表示这是一个函数工具
    "function": {
        "name": "get_weather",         # 工具名称（LLM 通过此名调用）
        "description": "查询指定城市的实时天气信息，包括温度和天气状况",
        "parameters": {                # 用 JSON Schema 描述输入参数
            "type": "object",
            "properties": {
                "city": {              # 参数名
                    "type": "string",  # 参数类型
                    "description": "城市名称，如'北京'、'上海'"  # 帮助 LLM 理解该传什么
                }
            },
            "required": ["city"]       # 标记哪些参数是必填的
        }
    }
}
```

### 描述的重要性

`description` 写得越好，LLM 越能准确地判断"什么时候该用这个工具"。

```
❌ 差的描述："查天气"
✅ 好的描述："查询指定城市的实时天气信息，包括温度、湿度和天气状况。
             当用户询问天气、气温、是否需要带伞等问题时使用此工具。"
```

---

## 4.4 动手：实现一个天气查询工具

### 完整代码

```python
# --- 导入依赖 ---
import json                            # 用于解析 LLM 返回的工具参数（JSON 格式）
from openai import OpenAI              # OpenAI SDK（DeepSeek 兼容此接口）
from dotenv import load_dotenv         # 从 .env 文件加载环境变量
import os

# --- 初始化客户端 ---
load_dotenv()
client = OpenAI(
    base_url="https://api.deepseek.com",  # DeepSeek API 地址
    api_key=os.getenv("DEEPSEEK_API_KEY"),
)

# --- 工具定义：告诉 LLM 有哪些工具可用 ---
# 每个工具包含名称、描述、参数 Schema，LLM 据此决定何时调用
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",         # 工具 1：查天气
            "description": "查询城市的实时天气",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "城市名"}
                },
                "required": ["city"]       # city 是必填参数
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_hotels",       # 工具 2：搜酒店
            "description": "搜索指定城市的酒店",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "城市名"},
                    "check_in": {"type": "string", "description": "入住日期"}
                },
                "required": ["city"]
            }
        }
    }
]

# --- 模拟工具执行（实际项目中替换为真实 API 调用）---
def execute_tool(name: str, args: dict) -> str:
    """根据工具名和参数返回模拟数据"""
    if name == "get_weather":
        return json.dumps({"city": args["city"], "temp": "25°C", "weather": "晴"})
    elif name == "search_hotels":
        return json.dumps({
            "city": args["city"],
            "hotels": [
                {"name": "和平饭店", "price": "680元/晚"},
                {"name": "锦江之星", "price": "320元/晚"}
            ]
        })
    return "未知工具"

# --- 智能体主循环：实现 Function Calling 的三步流程 ---
def agent_chat(user_message: str):
    # 构造初始消息列表
    messages = [
        {"role": "system", "content": "你是一个旅行助手，可以查天气和搜酒店。"},
        {"role": "user", "content": user_message}
    ]

    # 第一步：发送消息 + 工具列表，让 LLM 决定是否调用工具
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=messages,
        tools=tools,                   # 把工具列表传给 LLM
    )
    msg = response.choices[0].message

    # 第二步：如果 LLM 决定调用工具，执行工具并收集结果
    if msg.tool_calls:                 # 检查 LLM 是否返回了工具调用请求
        messages.append(msg)           # 把 LLM 的回复（含调用请求）加入历史
        for tool_call in msg.tool_calls:
            args = json.loads(tool_call.function.arguments)  # 解析 LLM 传来的参数
            result = execute_tool(tool_call.function.name, args)  # 执行工具
            messages.append({          # 把工具执行结果加入历史
                "role": "tool",        # 角色标记为 "tool"，告诉 LLM 这是工具返回
                "tool_call_id": tool_call.id,  # 与工具调用请求对应
                "content": result
            })

        # 第三步：把工具结果交给 LLM，生成最终的自然语言回复
        final = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,         # 包含完整历史：用户消息 + 工具调用 + 工具结果
        )
        return final.choices[0].message.content
    else:
        # 如果 LLM 认为不需要工具，直接返回普通回复
        return msg.content

# --- 测试三种场景 ---
print(agent_chat("北京今天天气怎么样？"))           # 场景 1：触发天气工具
print(agent_chat("帮我搜一下上海的酒店，下周一入住")) # 场景 2：触发酒店工具
print(agent_chat("你好！"))                       # 场景 3：无需工具，直接回复
```

### 旅行助手 v0.2 达成！

我们的旅行助手现在能：
- ✅ 回答一般性问题（和 v0.1 一样）
- ✅ 查天气（新增）
- ✅ 搜酒店（新增）
- ✅ 自动判断什么时候需要工具（新增）

---

## 4.5 工具调用的常见陷阱

| 陷阱 | 现象 | 解决 |
|------|------|------|
| **参数幻觉** | LLM 编造不存在的城市名作为参数 | 在工具函数中验证参数合法性 |
| **循环调用** | LLM 反复调用同一个工具 | 设置最大工具调用次数 |
| **忽略错误** | 工具执行失败，LLM 继续编造答案 | 把错误信息也返回给 LLM |
| **过度调用** | 不需要工具时也调用 | 优化描述，明确工具的适用场景 |

---

## 动手实践

### 🎯 添加一个新工具

给旅行助手添加第三个工具 `calculate_budget`，参数为 `days`（天数）和 `budget_per_day`（每日预算），返回总预算。

### 🚧 常见坑

**坑 #1：LLM 编造工具名**
- 现象：LLM 尝试调用一个你未定义的工具
- 原因：LLM 根据上下文"猜"了一个工具名
- 解决：在 system prompt 中明确列出可用工具，并在代码中处理未知工具的情况

### 🏋️ 进阶挑战

让旅行助手在一次对话中连续调用多个工具（如先查天气，再搜酒店），观察 LLM 如何整合多个工具的结果。

---

## 本章小结

### 📦 本章成果

旅行助手升级为 **v0.2**——它现在能查天气、搜酒店。更重要的是，它学会了"什么时候需要什么工具"。

### 🗂 知识卡片

| 概念 | 一句话解释 | 类比 |
|------|-----------|------|
| 工具调用 | LLM 决定调用什么工具，程序执行 | 给实习生一部手机 |
| Function Calling | OpenAI 的工具调用协议 | — |
| 工具描述 | 告诉 LLM 何时使用这个工具 | 工具说明书 |

### ⚠️ 还缺什么？

我们的旅行助手现在有了"手"（工具），但它的思考方式还很"直线"——收到问题就直接回答或调用工具。它不会**先规划再执行**。如果你说"帮我规划一个上海三日游"，它可能会一股脑输出文字，而不是"先查天气→再搜景点→再搜酒店→最后整合成行程"。

### ➡️ 下一章预告

第 5 章将介绍三种**智能体思维范式**：ReAct（边想边做）、Plan-and-Solve（先想后做）、Reflection（做完反思）。这些范式将让旅行助手从"直线思考"进化为"策略思考"。

---

## 习题

1. **[概念理解]** 工具调用中，LLM 和程序各自的职责是什么？为什么不让 LLM 直接执行工具？
2. **[概念理解]** 工具描述（description）为什么如此重要？写一个"差描述"和一个"好描述"的对比示例。
3. **[动手实践]** 为旅行助手添加 `calculate_budget` 工具，测试"如果我去上海玩3天，每天预算1000元，够吗？"
4. **[动手实践]** 故意给工具传入无效参数（如城市名"asdfgh"），观察 LLM 如何处理错误。
5. **[开放思考]** 如果给 LLM 100 个工具，它还能准确选择吗？工具数量增加会带来什么问题？

---

## 参考文献

- OpenAI. "Function Calling" Documentation
- Qin et al. (2023). "ToolLLM: Facilitating Large Language Models to Master 16000+ Real-world APIs"
- Schick et al. (2023). "Toolformer: Language Models Can Teach Themselves to Use Tools"
