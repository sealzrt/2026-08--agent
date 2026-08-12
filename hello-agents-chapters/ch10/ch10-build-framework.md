# 第 10 章：从零构建 Agent 框架

> 📖 路径标注：🟢 深入路径  
> ⏱ 预计阅读：35 分钟 | 动手实践：30 分钟

## 10.0 本章导读

### 为什么要自己造轮子？

你可能在想：已经有了 LangChain，为什么还要自己写框架？

三个原因：
1. **理解原理**：用过框架不等于理解框架。自己写一遍，才知道每个设计决策背后的"为什么"
2. **定制需求**：通用框架不一定满足你的特殊场景
3. **性能控制**：框架的黑盒部分可能成为性能瓶颈

> 💡 **类比**：会开车不等于懂车。但如果你要当赛车工程师，就必须理解引擎、变速箱、悬挂系统的原理。

### 学完本章你将能做什么？
- [ ] 能设计一个 Agent 框架的核心架构
- [ ] 能实现 LLM 抽象层、工具系统、Agent 循环
- [ ] 能理解框架中常见的设计模式

---

## 10.1-10.2 框架核心架构设计

一个 Agent 框架有四个核心层：

```
┌─────────────────────────────────┐
│  编排层（Agent Loop）            │ ← 控制思考-行动循环
├─────────────────────────────────┤
│  工具层（Tool Registry）         │ ← 注册、调度、执行工具
├─────────────────────────────────┤
│  记忆层（Memory Manager）        │ ← 对话历史、长期记忆
├─────────────────────────────────┤
│  LLM 层（LLM Provider）         │ ← 对接不同模型提供商
└─────────────────────────────────┘
```

每一层都是独立的，可以单独替换。

---

## 10.3 LLM 抽象层

```python
from abc import ABC, abstractmethod    # Python 抽象基类，用于定义接口
from openai import OpenAI              # OpenAI SDK（DeepSeek 兼容此接口）
import os                               # 用于读取环境变量

# --- LLM 抽象层：定义统一接口，屏蔽不同模型的差异 ---
class LLMProvider(ABC):
    @abstractmethod
    def chat(self, messages: list, tools: list = None) -> dict:
        """所有 LLM 提供者必须实现此接口"""
        pass

# --- DeepSeek 实现：通过 OpenAI 兼容接口调用 ---
class DeepSeekProvider(LLMProvider):
    def __init__(self, model="deepseek-chat"):
        self.client = OpenAI(                # 复用 OpenAI SDK
            base_url="https://api.deepseek.com",  # 指向 DeepSeek
            api_key=os.getenv("DEEPSEEK_API_KEY"),
        )
        self.model = model

    def chat(self, messages, tools=None):
        kwargs = {"model": self.model, "messages": messages}
        if tools:                            # 如果传入了工具列表，一起传给 LLM
            kwargs["tools"] = tools
        resp = self.client.chat.completions.create(**kwargs)
        return resp.choices[0].message       # 返回 LLM 的回复消息对象

# --- 本地模型实现：支持 Ollama / vLLM 等本地部署方案 ---
class LocalProvider(LLMProvider):
    """支持本地部署的开源模型"""
    def __init__(self, base_url="http://localhost:11434"):  # 默认 Ollama 端口
        self.base_url = base_url

    def chat(self, messages, tools=None):
        # 调用 Ollama / vLLM 等本地模型
        ...
```

---

## 10.4 工具注册与调度系统

```python
import json, inspect                   # json 用于序列化结果，inspect 用于自动提取函数签名

# --- 工具注册与调度系统：统一管理所有工具的注册、Schema 生成、执行 ---
class ToolRegistry:
    def __init__(self):
        self._tools = {}               # 内部字典，存储所有已注册的工具

    def register(self, name: str, description: str, func):
        """注册一个工具：自动从函数签名提取参数 Schema"""
        sig = inspect.signature(func)  # 获取函数的参数签名
        # 自动为每个参数生成 JSON Schema 描述
        params = {k: {"type": "string", "description": v.default if v.default != inspect.Parameter.empty else ""}
                  for k, v in sig.parameters.items()}
        # 存储工具的元数据、函数引用、Schema
        self._tools[name] = {
            "description": description,
            "function": func,           # 保存函数引用，供后续调用
            "schema": {"type": "function", "function": {
                "name": name, "description": description,
                "parameters": {"type": "object", "properties": params, "required": list(params.keys())}
            }}
        }

    def execute(self, name: str, args: dict) -> str:
        """执行工具：根据名称查找并调用，返回 JSON 字符串结果"""
        if name not in self._tools:    # 工具不存在，返回错误信息
            return json.dumps({"error": f"未知工具: {name}"})
        try:
            result = self._tools[name]["function"](**args)  # 调用工具函数
            # 如果返回的不是字符串，序列化为 JSON
            return json.dumps(result) if not isinstance(result, str) else result
        except Exception as e:         # 捕获工具执行异常
            return json.dumps({"error": str(e)})

    def get_schemas(self) -> list:
        """获取所有工具的 Schema 列表，传给 LLM 让它知道有哪些工具可用"""
        return [t["schema"] for t in self._tools.values()]
```

---

## 10.5-10.6 Agent 循环与编排引擎

```python
# --- Agent 编排引擎：将 LLM、工具、记忆组合成完整的 Agent 循环 ---
class Agent:
    def __init__(self, llm: LLMProvider, tools: ToolRegistry, system_prompt: str):
        self.llm = llm                 # LLM 提供者（可替换为 DeepSeek/OpenAI/本地模型）
        self.tools = tools             # 工具注册表
        self.system_prompt = system_prompt  # 系统提示词，定义 Agent 的角色和行为
        self.memory = []               # 对话记忆，跨轮次保存历史

    def run(self, user_input: str, max_steps: int = 10) -> str:
        """执行 Agent 主循环：用户输入 → LLM 思考 → 工具调用 → 最终回复"""
        # 将用户消息加入记忆
        self.memory.append({"role": "user", "content": user_input})
        # 构造完整消息列表：system + 历史记忆
        messages = [{"role": "system", "content": self.system_prompt}] + self.memory

        # Agent 循环：最多执行 max_steps 步（防止无限循环）
        for step in range(max_steps):
            # 调用 LLM，传入消息历史 + 工具 Schema
            response = self.llm.chat(messages, tools=self.tools.get_schemas())

            # 如果 LLM 没有调用工具，说明已经生成最终回复
            if not response.tool_calls:
                self.memory.append({"role": "assistant", "content": response.content})  # 保存到记忆
                return response.content  # 返回最终回复，结束循环

            # --- LLM 决定调用工具 ---
            messages.append(response)    # 把 LLM 的回复（含工具调用请求）加入消息历史
            for tc in response.tool_calls:
                args = json.loads(tc.function.arguments)  # 解析 LLM 传来的参数
                result = self.tools.execute(tc.function.name, args)  # 执行工具
                # 把工具执行结果加入消息历史，role="tool" 告诉 LLM 这是工具返回
                messages.append({"role": "tool", "tool_call_id": tc.id, "content": result})
            # 继续循环：让 LLM 看到工具结果，决定下一步动作

        return "达到最大步数限制"        # 安全阀：防止无限循环
```

这就是一个完整的 Agent 框架核心——不到 100 行代码。

---

## 10.7 框架设计模式总结

| 模式 | 在 Agent 框架中的应用 |
|------|---------------------|
| **观察者模式** | 工具执行结果通知 Agent Loop |
| **策略模式** | 不同 LLM Provider 可互换 |
| **责任链模式** | 中间件链：输入验证→日志→执行→输出过滤 |
| **状态机模式** | LangGraph 的状态图就是状态机 |

---

## 动手实践

### 🎯 从零构建一个完整的 Agent 框架

将上面的 LLMProvider + ToolRegistry + Agent 组合，注册天气和酒店工具，测试完整对话流程。

### 🚧 常见坑
**坑 #1：工具参数类型不匹配**
- 现象：LLM 传来字符串 "3"，但函数期望整数 3
- 解决：在 `execute` 中做类型转换

### 🏋️ 进阶挑战
为框架添加"中间件"机制：在 LLM 调用前后插入自定义逻辑（如日志、Token 计数、安全检查）。

---

## 本章小结

### ⚠️ 还缺什么？
我们现在有了单 Agent 框架。但如果多个 Agent 需要**互相通信**呢？比如"搜索 Agent"把结果传给"规划 Agent"？
### ➡️ 下一章
第 11 章：智能体通信协议——MCP、A2A、ANP，让不同的智能体能"对话"。

---

## 参考文献
- "Design Patterns: Elements of Reusable Object-Oriented Software" (GoF)
- LangChain Source Code: https://github.com/langchain-ai/langchain
