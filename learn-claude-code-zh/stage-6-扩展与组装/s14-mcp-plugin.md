# s14: MCP 插件 —— 能力不够就通过 MCP 接入更多

> Harness 层：MCP 工具 —— 连接外部服务、发现工具、加入 Agent 循环。

---

## 问题引入

前面章节的基础工具都写在 code.py 里。要接入文档系统和部署平台，就得为每个服务单独写工具定义、参数校验和调用处理。每接入一个新服务，代码就多一堆。

**类比**：你的电脑有很多外设——打印机、扫描仪、摄像头。如果每个外设都需要专用接口，你就得买一堆不同品牌的线缆。USB 标准解决了这个问题：所有设备用同一种插头。MCP（Model Context Protocol）就是 Agent 世界的"USB 接口"。

---

## 解决方案

MCP 分离了职责：**服务端**提供工具列表和调用端点，**Harness** 连接服务端、分配名称、应用权限检查、把发现的工具给模型。

本章添加三个部分：
- `MCPClient` 存储服务端的工具定义和调用处理函数
- `connect_mcp` 连接一个服务端并获取工具列表
- `assemble_tool_pool` 把基础工具和所有已连接服务端的工具组合在一起

---

## 工作原理

### 1. MCPClient 存储发现结果和调用处理

```python
class MCPClient:
    def __init__(self):
        self.tools = []       # 工具定义列表
        self._handlers = {}   # 工具名 -> 调用函数

    def register(self, tool_defs, handlers):
        """注册服务端返回的工具。"""
        self.tools = list(tool_defs)
        self._handlers = dict(handlers)

    def call_tool(self, tool_name, args):
        """调用一个 MCP 工具。"""
        handler = self._handlers.get(tool_name)
        if not handler:
            return f"MCP 错误：未知工具 '{tool_name}'"
        try:
            return str(handler(**args))
        except Exception as e:
            return f"MCP 错误：{type(e).__name__}: {e}"
```

### 2. 前缀隔离不同服务端的工具

多个服务端可能都暴露 `search` 或 `status`。Harness 用命名空间前缀：

```python
# 工具命名格式：mcp__{服务端名}__{工具名}
prefixed_name = f"mcp__{server_name}__{tool_name}"

# 例如 docs 服务端的 search 工具 → mcp__docs__search
```

### 3. connect_mcp 连接并发现

```python
mcp_clients = {}  # 服务端名 -> MCPClient

def connect_mcp(name: str) -> str:
    """连接一个 MCP 服务端并发现其工具。"""
    if name in mcp_clients:
        return f"MCP 服务端 '{name}' 已连接"
    factory = MOCK_SERVERS.get(name)
    if not factory:
        return f"未知服务端 '{name}'"
    server = factory()
    mcp_clients[name] = server
    return f"已连接 '{name}'，发现 {len(server.tools)} 个工具"
```

连接后，下一次模型调用时自动看到新工具：

```python
# 连接前：模型只看到 5 个基础工具
# 连接后：模型还看到 mcp__docs__search, mcp__docs__get_version
```

### 4. assemble_tool_pool 每轮组装工具池

```python
def assemble_tool_pool():
    """每轮组装当前工具池 = 基础工具 + 所有已连接 MCP 工具。"""
    tools = list(BUILTIN_TOOLS)
    handlers = dict(BUILTIN_HANDLERS)

    for server_name, client in mcp_clients.items():
        for tool_def in client.tools:
            raw_name = tool_def["name"]
            prefixed = f"mcp__{server_name}__{raw_name}"
            tools.append({
                "type": "function",
                "function": {
                    "name": prefixed,
                    "description": tool_def.get("description", ""),
                    "parameters": tool_def.get("parameters", {}),
                },
            })
            # 用默认参数捕获当前的 client 和 raw_name
            handlers[prefixed] = (
                lambda *, c=client, n=raw_name, **kw: c.call_tool(n, kw)
            )
    return tools, handlers
```

### 5. 宿主决定权限

MCP 服务端可能提供 `readOnlyHint`，但那是服务端的提示，不是授权。Harness 有自己的策略：

```python
MCP_HOST_POLICY = {
    ("docs", "search"): "allow",       # 文档搜索：允许
    ("docs", "get_version"): "allow",  # 获取版本：允许
    ("deploy", "status"): "allow",     # 查看状态：允许
    ("deploy", "trigger"): "confirm",  # 触发部署：需确认
}

def permission_hook(tool_name, args):
    # 检查 MCP 策略
    if tool_name.startswith("mcp__"):
        parts = tool_name.split("__")
        server, tool = parts[1], parts[2]
        policy = MCP_HOST_POLICY.get((server, tool), "confirm")
        if policy == "confirm":
            if input(f"  MCP 工具 {tool_name} 需要确认，允许？[y/N] ").strip().lower() != "y":
                return "MCP 权限被拒绝"
    return None
```

### 6. 输入错误留在工具边界

模型可能漏传必填参数。错误作为工具结果返回，不终止循环：

```python
# 模型漏传 query 参数
# → MCP 错误: TypeError: <lambda>() missing 1 required argument: 'query'
# → 模型在下轮可以修正参数
```

---

## 完整代码（核心片段）

```python
import os, json, subprocess
from pathlib import Path
from openai import OpenAI   # DeepSeek 兼容 OpenAI SDK，所以用 openai 包
from dotenv import load_dotenv

# 从 .env 文件加载环境变量
load_dotenv()

# ---- DeepSeek API 客户端初始化 ----
deepseek_client = OpenAI(api_key=os.getenv("DEEPSEEK_API_KEY"), base_url="https://api.deepseek.com")
MODEL = os.getenv("MODEL_ID", "deepseek-chat")  # 模型名称
WORKDIR = Path(".").resolve()                    # 工作目录的绝对路径
SYSTEM = f"你是编程助手，工作目录 {WORKDIR}。可用 connect_mcp 连接外部工具。"

# ---- MCP 系统（s14 新增）：mcp__{server}__{tool} 命名空间 + assemble_tool_pool 动态组装 ----
class MCPClient:
    """MCP 客户端：管理外部工具定义和调用。"""
    def __init__(self): self.tools, self._handlers = [], {}
    def register(self, defs, handlers): self.tools, self._handlers = list(defs), dict(handlers)
    def call_tool(self, name, args):
        h = self._handlers.get(name)
        if not h: return f"MCP 错误: 未知 '{name}'"
        try: return str(h(**args))
        except Exception as e: return f"MCP 错误: {e}"

mcp_clients = {}

# 模拟服务端
def docs_server():
    c = MCPClient()
    c.register(
        [{"name": "search", "description": "搜索文档",
          "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}},
         {"name": "get_version", "description": "获取文档版本",
          "parameters": {"type": "object", "properties": {}}}],
        {"search": lambda query: f"搜索 '{query}' 的结果: 找到 3 条匹配",
         "get_version": lambda: "文档 API v2.1.0"}
    )
    return c

MOCK_SERVERS = {"docs": docs_server}

BUILTIN_TOOLS = [
    {"type": "function", "function": {"name": "bash", "description": "执行命令",
        "parameters": {"type": "object", "properties": {"command": {"type": "string"}}, "required": ["command"]}}},
    {"type": "function", "function": {"name": "read_file", "description": "读取文件",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}}},
    {"type": "function", "function": {"name": "write_file", "description": "写入文件",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]}}},
    {"type": "function", "function": {"name": "connect_mcp", "description": "连接 MCP 服务端",
        "parameters": {"type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"]}}},
]
BUILTIN_HANDLERS = {
    "bash": lambda command: subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30).stdout or "(无输出)",
    "read_file": lambda path: (WORKDIR / path).read_text(),
    "write_file": lambda path, content: (WORKDIR / path).write_text(content) or f"已写入 {len(content)} 字节",
}

def connect_mcp(name):
    if name in mcp_clients: return f"'{name}' 已连接"
    factory = MOCK_SERVERS.get(name)
    if not factory: return f"未知 '{name}'"
    mcp_clients[name] = factory()
    return f"已连接 '{name}'，发现 {len(mcp_clients[name].tools)} 个工具"
BUILTIN_HANDLERS["connect_mcp"] = connect_mcp

def assemble_tool_pool():
    tools, handlers = list(BUILTIN_TOOLS), dict(BUILTIN_HANDLERS)
    for sname, c in mcp_clients.items():
        for td in c.tools:
            pfx = f"mcp__{sname}__{td['name']}"
            tools.append({"type": "function", "function": {
                "name": pfx, "description": td.get("description",""),
                "parameters": td.get("parameters", {})}})
            handlers[pfx] = lambda *, cl=c, n=td["name"], **kw: cl.call_tool(n, kw)
    return tools, handlers

def agent_loop(messages):
    """核心循环：每轮动态组装工具池（内置 + MCP）。"""
    while True:
        # ★ s14 新增：每轮动态组装工具池
        tools, handlers = assemble_tool_pool()
        # 调用 DeepSeek API
        response = deepseek_client.chat.completions.create(
            model=MODEL, messages=[{"role": "system", "content": SYSTEM}] + messages,
            tools=tools, max_tokens=4096)
        msg = response.choices[0].message; messages.append(msg)
        if not msg.tool_calls:
            print(f"\nAgent: {msg.content}"); return
        for tc in msg.tool_calls:
            args = json.loads(tc.function.arguments)
            h = handlers.get(tc.function.name)
            output = h(**args) if h else f"未知: {tc.function.name}"
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": output})

if __name__ == "__main__":
    q = input("s14 >> ").strip()
    agent_loop([{"role": "user", "content": q}])
```

---

## 动手试一试

1. 输入"连接 docs 服务端，搜索 agent hooks，告诉我文档版本"
2. 观察连接后工具池是否自动包含 `mcp__docs__search`
3. 尝试调用 MCP 工具时漏传参数，观察错误处理

---

## 常见坑

**坑 1：MCP 工具名冲突**
- 现象：两个服务端都暴露 `search`，名字变成同一个
- 原因：没有用命名空间前缀
- 解决：统一用 `mcp__{server}__{tool}` 格式

**坑 2：信任服务端的权限提示**
- 现象：服务端声称工具是 readOnly，Harness 就跳过检查
- 原因：混淆了"服务端的自我描述"和"宿主的授权策略"
- 解决：宿主维护自己的策略表，默认未配置的工具需确认

---

## 与上一章的关系

s13 让多个 Agent 协作。s07 让知识按需加载。s14 在此基础上让 Agent 能**连接外部工具**——不再局限于 code.py 中硬编码的工具。

---

## 下一章预告

MCP 在这里还是独立的机制演示。下一章把所有机制——基础工具、钩子、技能、上下文、记忆、任务、后台、定时、团队、MCP——放进同一个运行时。

**下一章 s15**：集成 Harness——多种机制，一个循环。

---

## 速查表

| 概念 | 一句话解释 |
|------|-----------|
| MCPClient | 存储服务端的工具定义和调用处理 |
| connect_mcp | 连接服务端并发现工具 |
| assemble_tool_pool | 每轮组装基础工具 + MCP 工具 |
| mcp__server__tool | MCP 工具的命名空间前缀 |
| 宿主策略 | 宿主决定权限，不信任服务端的自我描述 |
