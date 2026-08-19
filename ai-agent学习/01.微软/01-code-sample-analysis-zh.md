# 第 1 课代码示例逐行解析：你的第一个 AI Agent（零基础版）

来源：[01-python-agent-framework.ipynb](https://github.com/microsoft/ai-agents-for-beginners/blob/main/01-intro-to-ai-agents/code_samples/01-python-agent-framework.ipynb)

> 本文面向**完全不懂 Python** 的读者，逐行拆解第 1 课的官方代码示例。这个示例构建了一个"旅行顾问 Agent"：用户问"想去温暖的海滩度假，有什么推荐？"，Agent 会自己调用一个查询函数拿到目的地清单，再用大模型组织出推荐答案。
>
> 配套课程讲解：[01-AI Agent 简介与应用场景](01-ai-agents-intro-zh-optimized.md)

## 0. 先搞懂：什么是 .ipynb（notebook）文件

这个示例不是普通的程序文件，而是一个 **Jupyter Notebook**（后缀 `.ipynb`）。可以把它理解成一份"可以运行的笔记"：

- 整个文件由一个个**单元格（cell）**组成，有的单元格是**文字说明**，有的是**代码**
- 代码单元格可以**一格一格单独运行**（点击左侧 ▶ 按钮），运行结果直接显示在这一格下方
- 前面单元格运行产生的东西（比如变量），后面的单元格可以接着用

所以读这个示例的正确方式是：**从上往下，一格一格看**。整个 notebook 一共 5 个代码单元格，做的事情是：

```
① 安装工具包 → ② 连接云端大模型 → ③ 定义一个"工具函数" → ④ 创建 Agent 并提问 → ⑤ 流式输出（打字机效果）
```

## 1. 运行前提（为什么直接跑会报错）

这个示例连接的是微软云（Microsoft Foundry）上的大模型，所以运行前需要三样东西：

1. 一个 **Microsoft Foundry 项目**，里面已部署了一个聊天模型（如 `gpt-5-mini`）
2. 在终端执行过 `az login`（用 Azure 账号登录，代码靠这个获得权限）
3. 设置两个**环境变量**（可以理解为"写在系统里的配置项"）：
   - `AZURE_AI_PROJECT_ENDPOINT`——你的 Foundry 项目地址（一个网址）
   - `AZURE_AI_MODEL_DEPLOYMENT_NAME`——你部署的模型名字

> 💡 没有 Azure 账号也没关系——本文的目的是**读懂代码在干什么**，第 17 课还会教完全本地免费运行的方式。

## 2. 单元格 ①：安装依赖包

```python
%pip install agent-framework azure-ai-projects azure-identity -q
```

**逐个解释：**

| 部分 | 含义 |
|------|------|
| `%pip install` | notebook 里的"安装命令"，相当于给 Python 装扩展包（类似手机装 App） |
| `agent-framework` | 微软 Agent 框架——本课的主角，提供"创建 Agent"的能力 |
| `azure-ai-projects` | 连接微软 Foundry 云服务用的包 |
| `azure-identity` | 处理 Azure 登录身份验证的包 |
| `-q` | quiet（安静模式），少打印安装过程的日志 |

Python 生态的惯例：**基础语言很小，能力靠装包获得**。装完这一次，后面就能 `import`（导入）使用了。

## 3. 单元格 ②：连接云端大模型

这是最长的一格，我们分四段看。

### 3.1 压制无关日志

```python
import logging
logging.getLogger("agent_framework.foundry").setLevel(logging.ERROR)
```

- `import logging`：导入 Python 自带的"日志"模块。`import` 的意思是"把某个包拿进来用"
- 第二行：把 agent 框架的日志级别调到"只显示错误"，避免运行时刷屏——纯粹为了输出干净，和 Agent 逻辑无关

### 3.2 导入要用的东西

```python
import os
import dotenv
from agent_framework.foundry import FoundryChatClient
from azure.identity import AzureCliCredential
from agent_framework import tool
```

| 语句 | 拿进来的是什么 |
|------|----------------|
| `import os` | 操作系统交互模块，等下用它**读环境变量** |
| `import dotenv` | 能读取 `.env` 配置文件的小工具 |
| `from ... import FoundryChatClient` | "Foundry 聊天客户端"——**负责和云端大模型通信的连接器** |
| `from ... import AzureCliCredential` | "Azure 命令行凭据"——**自动复用你 `az login` 的登录状态**，代码里就不用写密码 |
| `from ... import tool` | 一个特殊标记（后面第 4 节讲），用来**把普通函数变成 Agent 能用的工具** |

> 💡 `import X` 是整包导入；`from X import Y` 是只从包里拿出 Y 这一件东西。就像"把整个工具箱搬来" vs "只拿出螺丝刀"。

### 3.3 读取配置

```python
dotenv.load_dotenv(dotenv.find_dotenv())

endpoint = os.getenv("AZURE_AI_PROJECT_ENDPOINT")
model = os.getenv("AZURE_AI_MODEL_DEPLOYMENT_NAME")
```

- 第一行：找到并加载 `.env` 文件（一个存配置的文本文件，内容形如 `AZURE_AI_PROJECT_ENDPOINT=https://xxx`）。**把密钥、地址写在配置文件而不是代码里，是重要的安全习惯**
- 后两行：`os.getenv("名字")` 表示"按名字读一个环境变量的值"，读到的值存进**变量** `endpoint` 和 `model`

> 💡 **变量**就是一个贴了名字的储物盒：`endpoint = ...` 的意思是"把右边的值放进名叫 endpoint 的盒子里"，后面用 `endpoint` 这个名字就能取出来。

### 3.4 检查配置 + 创建连接

```python
if not endpoint or not model:
    raise ValueError(
        "Missing required environment variables. "
        "Please set AZURE_AI_PROJECT_ENDPOINT and AZURE_AI_MODEL_DEPLOYMENT_NAME in your .env file."
    )

provider = FoundryChatClient(
    project_endpoint=endpoint,
    model=model,
    credential=AzureCliCredential()
)
```

- `if not endpoint or not model:`——"如果 endpoint 是空的，**或者** model 是空的"，就执行缩进的下一行
- `raise ValueError(...)`——主动报错并停止运行，错误信息会告诉你缺了哪个配置。**先检查、早报错**，比稀里糊涂跑到一半失败要好
- `provider = FoundryChatClient(...)`——创建一个连接器对象，并告诉它三件事：项目地址（`project_endpoint=`）、用哪个模型（`model=`）、用什么身份（`credential=`，即你 az login 的登录态）

> 💡 Python 用**缩进**（行首空格）表示"从属关系"：`if` 下面缩进的行，只有条件成立时才执行。这是 Python 和多数语言最不一样的地方。

运行到这里，`provider` 就是一条**已经接通云端大模型的电话线**。

## 4. 单元格 ③：定义工具函数——Agent 的"手"

```python
@tool(approval_mode="never_require")
def get_destinations() -> list[str]:
    """Get a list of popular vacation destinations."""
    return [
        "Barcelona",
        "Paris",
        "Berlin",
        "Tokyo",
        "Sydney",
        "New York City",
        "Cairo",
        "Cape Town",
        "Rio de Janeiro",
        "Bali",
    ]
```

这一格是**整个示例最核心的概念**，我们拆开讲：

### 4.1 函数是什么

```python
def get_destinations() -> list[str]:
```

- `def` = define（定义），意思是"我要定义一个函数了"
- **函数**就是一段打包好、可以反复调用的代码，这个函数名叫 `get_destinations`（获取目的地）
- `()` 为空表示它不需要任何输入
- `-> list[str]` 是"返回值说明"：它会返回**一个字符串列表**（list = 清单，str = string 文字）

### 4.2 函数体做了什么

- `"""Get a list of popular vacation destinations."""` 这行三引号文字叫**文档字符串（docstring）**——它不是给人看的注释这么简单，**Agent 框架会把这句话发给大模型，模型靠它理解"这个工具是干嘛的、什么时候该调用它"**。所以写好 docstring 直接影响 Agent 的智商
- `return [...]`——返回一个写死的 10 个城市清单。真实项目里这里会去查数据库或调用航班 API，示例为了简单直接写死

### 4.3 `@tool` 是什么魔法

```python
@tool(approval_mode="never_require")
```

- 以 `@` 开头的这行叫**装饰器**——把它想象成给函数"盖一个章"：盖了这个章，普通 Python 函数就**注册成了 Agent 可以调用的工具**
- `approval_mode="never_require"` 表示调用这个工具**不需要人工批准**。查个城市列表无风险，当然不用批；但如果工具是"扣款"、"删数据"，就应该设置成需要人批准（这正是第 6/16 课讲的"人在环中"）

**为什么需要工具？** 大模型本身只会"说话"，不会"做事"，而且它的知识可能过时。工具让 Agent 能拿到**真实、实时**的数据——这就是课程说的 Agent 三要素"LLM + 工具 + 知识"里的"工具"。

## 5. 单元格 ④：创建 Agent 并提问（主戏）

```python
agent = provider.as_agent(
    name="TravelAgent",
    instructions=(
        "You are a helpful travel agent. Help users find their perfect vacation "
        "destination based on their preferences. Use the get_destinations tool "
        "to see available destinations."
    ),
    tools=[get_destinations],
)

response = await agent.run(
    "I'm looking for a warm beach destination. What do you recommend?"
)
print(response)
```

### 5.1 组装 Agent 的三要素

`provider.as_agent(...)` 的意思是"用这条电话线（provider），组装出一个 Agent"，参数正好对应 Agent 的三要素：

| 参数 | 值 | 作用 |
|------|-----|------|
| `name=` | `"TravelAgent"` | 给 Agent 起个名字 |
| `instructions=` | "你是一个乐于助人的旅行顾问……用 get_destinations 工具查看可选目的地" | **人设说明书（系统提示词）**：规定它是谁、怎么做事 |
| `tools=` | `[get_destinations]` | **发给它的工具箱**：把刚才定义的函数放进列表交给它 |

### 5.2 运行并等待回答

```python
response = await agent.run("I'm looking for a warm beach destination. ...")
print(response)
```

- `agent.run("问题")`——把用户的话交给 Agent 处理
- `await` = "等它做完"。因为 Agent 要联网问大模型，需要几秒钟，`await` 表示程序在这里**等待云端返回结果**再继续（这叫异步编程，现阶段记住"await = 等结果"就够了）
- `print(response)`——把回答打印到屏幕上

### 5.3 这几秒钟内幕里发生了什么（重点！）

你只写了一行 `agent.run(...)`，但幕后自动发生了**一来一回好几步**：

```
用户问题 ─→ 大模型思考："要推荐目的地，我得先看看有哪些可选"
              │
              ▼
          决定调用工具 get_destinations（框架自动执行这个 Python 函数）
              │
              ▼
          函数返回 10 个城市 ─→ 送回给大模型
              │
              ▼
          大模型结合"温暖海滩"的需求，从清单里挑出
          巴厘岛、里约热内卢、悉尼等，组织成人话回答
              │
              ▼
          你拿到 response
```

**Agent 和普通聊天机器人的分水岭就在这里**：模型自己决定"我需要先调用工具拿数据"，而不是凭记忆瞎编。这个"思考 → 调工具 → 拿结果 → 再回答"的循环，就是之后所有课程反复出现的 **Agent 循环（agentic loop）**。

## 6. 单元格 ⑤：流式输出（打字机效果）

```python
async for chunk in agent.run(
    "Tell me about Tokyo as a travel destination", stream=True
):
    print(chunk, end="", flush=True)
```

- 上一格是**等全部回答生成完**才一次性显示；这一格加了 `stream=True`（流式开关），回答**每生成一小段（chunk）就立刻吐出来**
- `async for chunk in ...:`——"每收到一小块文字，就执行一次下面缩进的代码"
- `print(chunk, end="", flush=True)`——打印这一小块；`end=""` 表示不换行（默认每次 print 会换行，这样会碎成一行一个词）；`flush=True` 表示立刻显示、不要攒着

效果就是 ChatGPT 那种**逐字蹦出来的打字机效果**。做聊天界面时几乎必用——用户不用对着空白屏幕干等。

## 7. 全景回顾：34 行代码干了什么

| 单元格 | 代码要点 | 对应的 Agent 概念 |
|--------|----------|------------------|
| ① | `%pip install` | 准备环境 |
| ② | `FoundryChatClient(...)` | **LLM**：接通推理引擎 |
| ③ | `@tool` + `def get_destinations()` | **工具**：给 Agent 一双手 |
| ④ | `as_agent(instructions=..., tools=...)` + `run()` | **组装三要素**并跑一次完整 Agent 循环 |
| ⑤ | `stream=True` + `async for` | 用户体验：流式输出 |

## 8. 顺便学到的 7 个 Python 基础概念

读完这个示例，你其实已经见过了 Python 最常用的语法，汇总备查：

| 概念 | 长相 | 一句话理解 |
|------|------|-----------|
| 导入 | `import os` / `from x import y` | 把别人写好的功能拿来用 |
| 变量 | `endpoint = os.getenv(...)` | 给一个值贴上名字，方便后面用 |
| 条件判断 | `if not endpoint or not model:` | 满足条件才执行缩进的代码 |
| 函数 | `def get_destinations():` | 打包一段可反复调用的代码 |
| 列表 | `["Barcelona", "Paris", ...]` | 一串按顺序排列的值（清单） |
| 装饰器 | `@tool(...)` | 给函数"盖章"，赋予额外能力 |
| 异步 | `await` / `async for` | 遇到耗时操作（如联网）时"等结果" |

## 9. 想自己动手改？三个安全的小实验

1. **加城市**：在 `get_destinations` 的列表里加一个 `"Sanya"`（三亚），重跑单元格 ③④，看模型是否会推荐它
2. **改人设**：把 `instructions` 改成"你是一个只推荐亚洲目的地的旅行顾问"，观察回答变化——体会**系统提示词的威力**
3. **换问题**：把 `agent.run(...)` 里的问题改成中文"我想去看雪，推荐哪里？"——大模型能理解中文，即使指令和工具都是英文的

---

- 课程正文：[01-AI Agent 简介与应用场景](01-ai-agents-intro-zh-optimized.md)
- 想理解工具调用的完整机制 → [04-工具使用设计模式](04-tool-use-zh-optimized.md)
- 不想用 Azure 云、想本地免费跑 → [17-创建本地 AI Agent](17-creating-local-ai-agents-zh-optimized.md)
