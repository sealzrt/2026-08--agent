# s01: 智能体循环 —— 一个循环就是一切

> "一个循环 + Bash = 一个 Agent" —— 一个工具加一个循环，就构成了一个智能体。
> Harness 层：循环 —— 模型与现实世界之间的第一座桥梁。

---

## 问题引入

想象你有一个非常聪明的助手，但你只能通过纸条和它交流。你写一张纸条："帮我列出目录里的文件"，它回复一张纸条："好的，需要执行 `ls`"。然后你得自己去执行这个命令，把结果抄在纸条上再递回去。

每一轮往返，**你就是中间层**。你手动运行命令、粘贴结果、等模型继续思考。

**类比**：这就像你在两个人之间当传话筒。A 说了一句话，你跑去告诉 B；B 回复了，你又跑回去告诉 A。能不能搞个自动传话机？

本章要解决的就是这个问题：**把"人肉传话"变成自动循环**。

---

## 解决方案

一个 `while True` 循环：模型调用工具就继续，不调用工具就退出。整个过程靠两个信号控制：

| 信号 | 含义 | 循环动作 |
|------|------|---------|
| `response` 中包含 `tool_calls` | 模型举手说"我需要工具" | 执行工具 → 把结果喂回去 → 继续 |
| `response` 中没有 `tool_calls` | 模型说"我说完了" | 退出循环 |

---

## 工作原理

### 第一步：用用户的问题作为初始消息

```python
# messages 是模型能看到的所有对话历史
messages = [{"role": "user", "content": user_query}]
```

### 第二步：把消息和工具定义发给 LLM

```python
response = client.chat.completions.create(
    model=MODEL,
    messages=[{"role": "system", "content": SYSTEM}] + messages,
    tools=TOOLS,          # 告诉模型有哪些工具可用
    max_tokens=4096,
)
```

### 第三步：把模型的回复追加到历史中，检查是否调用了工具

```python
# 把模型的回复加入对话历史
messages.append(response.choices[0].message)

# 如果没有工具调用，模型说完了，退出
if not response.choices[0].message.tool_calls:
    print(response.choices[0].message.content)
    return
```

### 第四步：执行模型请求的工具，收集结果

```python
for tool_call in response.choices[0].message.tool_calls:
    # 根据工具名找到对应的处理函数
    handler = TOOL_HANDLERS[tool_call.function.name]
    # 解析参数并执行
    args = json.loads(tool_call.function.arguments)
    output = handler(**args)
    # 把工具结果追加到对话历史
    messages.append({
        "role": "tool",
        "tool_call_id": tool_call.id,
        "content": output,
    })
```

### 第五步：回到第二步

组装成完整函数，不到 30 行——这就是最小可运行的 Agent Harness 内核：

```python
import os, json
from openai import OpenAI   # DeepSeek 兼容 OpenAI SDK，所以用 openai 包
from dotenv import load_dotenv

# 从 .env 文件加载环境变量（DEEPSEEK_API_KEY、MODEL_ID）
load_dotenv()

# ---- DeepSeek API 客户端初始化 ----
# DeepSeek 兼容 OpenAI 协议，只需把 base_url 指向 DeepSeek 的服务地址
deepseek_client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),   # 从环境变量读取 API Key
    base_url="https://api.deepseek.com",      # DeepSeek API 地址
)
MODEL = os.getenv("MODEL_ID", "deepseek-chat")  # 模型名称，默认 deepseek-chat（DeepSeek-V3）
SYSTEM = "你是一个编程助手，可以使用 bash 工具执行命令。"  # 系统提示词：定义 Agent 的角色

# ---- 工具定义：告诉模型有哪些工具可用，以及每个工具需要什么参数 ----
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "bash",                            # 工具名称（模型用它来调用）
            "description": "在终端中执行一条 shell 命令。",  # 工具描述（帮助模型理解何时使用）
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "要执行的命令"}
                },
                "required": ["command"],  # 必填参数
            },
        },
    }
]

# ---- 工具实现：每个工具对应一个 Python 函数 ----
def run_bash(command: str) -> str:
    """执行一条 shell 命令并返回输出。"""
    import subprocess
    result = subprocess.run(
        command, shell=True, capture_output=True, text=True, timeout=30
    )
    return result.stdout or result.stderr or "(无输出)"

# ---- 工具分发表：工具名 -> 处理函数 ----
# 模型返回 tool_call 时，用工具名在这里查找对应的执行函数
TOOL_HANDLERS = {"bash": run_bash}

def agent_loop(messages: list):
    """核心循环：模型调用工具就继续，不调用就退出。
    
    参数:
        messages: 对话历史列表，包含所有已发送和接收的消息
    """
    while True:
        # 第一步：把对话历史和工具定义发给 DeepSeek API
        response = deepseek_client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "system", "content": SYSTEM}] + messages,  # 系统提示词 + 对话历史
            tools=TOOLS,        # 告诉模型有哪些工具可用
            max_tokens=4096,    # 单次回复最大 token 数
        )
        # 第二步：取出模型的回复，追加到对话历史中
        msg = response.choices[0].message
        messages.append(msg)

        # 第三步：检查模型是否调用了工具
        # 没有工具调用 → 模型说完了，打印结果并退出循环
        if not msg.tool_calls:
            print(f"\nAgent: {msg.content}")
            return

        # 第四步：有工具调用 → 逐个执行，收集结果
        for tool_call in msg.tool_calls:
            handler = TOOL_HANDLERS[tool_call.function.name]  # 根据工具名找到处理函数
            args = json.loads(tool_call.function.arguments)    # 解析模型传来的参数（JSON 格式）
            output = handler(**args)                           # 执行工具，获取结果
            # 把工具结果追加到对话历史，让模型在下一轮能看到
            messages.append({
                "role": "tool",                  # 角色标记为 "tool"，表示这是工具输出
                "tool_call_id": tool_call.id,    # 关联到对应的工具调用
                "content": output,               # 工具的执行结果
            })
        # 第五步：回到循环顶部，把新的 messages（含工具结果）发给模型

if __name__ == "__main__":
    # 读取用户输入，初始化对话历史，启动 Agent 循环
    query = input("你 >> ").strip()
    history = [{"role": "user", "content": query}]  # 用用户输入作为第一条消息
    agent_loop(history)
```

**关键理解**：这不到 30 行代码不是智能本身，而是让智能能够持续行动的**最小运行时框架**。模型负责决策（是否调用工具、调用哪个），Harness 负责执行（调用工具、追加结果）。后面的 16 个章节全部在这个循环上添加机制，**循环本身永远不会改变**。

---

## 动手试一试

1. 运行 `python s01_agent_loop.py`，输入"帮我列出当前目录的文件"
2. 输入"创建一个叫 hello.py 的文件，内容是 print('Hello World')"
3. 输入"当前 git 分支是什么？"

**观察重点**：模型什么时候调用了工具（循环继续）？什么时候没有调用（循环结束）？

---

## 常见坑

**坑 1：忘记 `while True`**
- 现象：Agent 只执行一次工具调用就停了
- 原因：没有用循环，模型返回一次就返回了
- 解决：用 `while True` 让循环持续运行，直到模型不再调用工具

**坑 2：工具结果没有追加到 messages**
- 现象：模型"忘记"了刚才执行的结果
- 原因：工具输出没有作为新消息加入对话历史
- 解决：每次工具执行后，必须 `messages.append({"role": "tool", ...})`

---

## 与上一章的关系

这是整个课程的第一章，没有前置依赖。

---

## 下一章预告

现在的 Agent 只有一个工具：`bash`。读文件要用 `cat`，写文件要用 `echo >`，找文件要用 `find`——很丑，也容易出错。

**下一章 s02**：给 Agent 5 个专用工具（读文件、写文件、编辑、搜索、bash），看看加一个工具到底需要改几行代码？

---

## 速查表

| 概念 | 一句话解释 |
|------|-----------|
| Agent Loop | `while True` 循环：模型调用工具就继续，不调用就退出 |
| messages[] | 对话历史列表，是模型能看到的全部上下文 |
| tool_calls | 模型回复中的工具调用请求，包含工具名和参数 |
| TOOL_HANDLERS | 工具名到处理函数的映射表，是工具分发中心 |
| role: "tool" | 工具执行结果的消息类型，告诉模型"这是工具的输出" |
