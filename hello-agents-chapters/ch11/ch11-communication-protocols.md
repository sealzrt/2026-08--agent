# 第 11 章：智能体通信协议

> 📖 路径标注：🟢 深入路径  
> ⏱ 预计阅读：30 分钟 | 动手实践：20 分钟

## 11.0 本章导读

### 这一章解决什么问题？
你的旅行助手能查天气、搜酒店、做规划。但如果你想让它和另一个"机票预订助手"合作呢？它们之间怎么通信？

**通信协议**就是智能体之间的"通用语言"——就像 USB 接口让不同设备能互相连接。

### 学完本章你将能做什么？
- [ ] 能区分 MCP、A2A、ANP 三种协议的用途
- [ ] 能构建自定义 MCP 服务器
- [ ] 能在智能体中使用 MCP 工具

---

## 11.1 为什么需要通信协议？

### 三种互联层次

| 层次 | 问题 | 解决方案 |
|------|------|---------|
| 工具互联 | 智能体如何调用外部工具？ | **MCP**（Model Context Protocol） |
| Agent 互联 | 两个智能体如何协作？ | **A2A**（Agent-to-Agent Protocol） |
| 网络发现 | 互联网上如何找到其他智能体？ | **ANP**（Agent Network Protocol） |

---

## 11.2 MCP：模型上下文协议

### 核心概念

> 💡 **类比**：MCP 就像 **USB 接口**——不管什么品牌的设备，只要用 USB，就能连上电脑。MCP 让任何智能体都能用统一方式调用外部工具和数据源。

```
┌──────────┐    MCP 协议    ┌──────────────┐
│  智能体   │ ←───────────→ │  MCP 服务器   │
│ (客户端)  │               │  (提供工具)   │
└──────────┘               └──────────────┘
                              ├── 天气工具
                              ├── 地图工具
                              └── 数据库工具
```

### 使用 MCP 工具

```python
# --- MCP 客户端：连接 MCP 服务器并使用工具 ---
from mcp import ClientSession, StdioServerParameters  # MCP 客户端组件
from mcp.client.stdio import stdio_client             # 通过标准输入/输出通信

# 配置 MCP 服务器：指定启动命令和参数
server_params = StdioServerParameters(
    command="python",                # 启动命令
    args=["weather_server.py"]       # 服务器脚本
)

# 建立连接并使用工具
async with stdio_client(server_params) as (read, write):  # 启动服务器进程
    async with ClientSession(read, write) as session:     # 创建客户端会话
        await session.initialize()                        # 初始化连接
        tools = await session.list_tools()                # 获取服务器提供的工具列表
        # 调用工具，就像调用本地函数一样
        result = await session.call_tool("get_weather", {"city": "北京"})
```

---

## 11.3 A2A：智能体间通信

> 💡 **类比**：A2A 就像**同事之间的协作规范**——谁负责什么、怎么委派任务、怎么汇报结果。

```python
# --- A2A 通信示例：Agent 之间通过 JSON 消息委派任务 ---

# Agent A（规划者）向 Agent B（搜索者）委派任务
task = {
    "from": "planner-agent",          # 发送方
    "to": "search-agent",             # 接收方
    "task": "搜索上海五星级酒店",   # 任务描述
    "deadline": "2024-01-15T10:00:00Z"  # 截止时间
}

# Agent B 完成任务后返回结果
result = {
    "from": "search-agent",           # 返回方
    "to": "planner-agent",            # 接收方
    "status": "completed",            # 任务状态
    "data": [{"name": "和平饭店", "price": "2800元/晚"}]  # 搜索结果
}
```

---

## 11.4 ANP：开放网络中的智能体发现

> 💡 **类比**：ANP 就像**黄页电话簿**——你可以在上面查找"哪里有餐厅""哪里有修车铺"。

ANP 解决的问题：在互联网上，怎么找到能提供特定服务的智能体？

---

## 11.5 动手：构建自定义 MCP 服务器

```python
# --- 构建自定义 MCP 服务器：对外暴露工具接口 ---
from mcp.server import Server          # MCP 服务器基类
from mcp.types import Tool, TextContent  # 工具类型 + 返回内容类型

# 创建服务器实例（名称用于标识）
server = Server("travel-tools")

# --- 用装饰器注册工具 ---
@server.tool("get_weather")            # 工具名：get_weather
async def get_weather(city: str) -> TextContent:
    """查询城市天气"""                  # docstring 成为工具描述
    return TextContent(type="text", text=f"{city}: 25°C, 晴")  # 返回文本结果

@server.tool("search_hotels")          # 工具名：search_hotels
async def search_hotels(city: str, check_in: str = "") -> TextContent:
    """搜索酒店"""
    hotels = [                         # 模拟酒店数据
        {"name": "和平饭店", "price": "680元/晚"},
        {"name": "锦江之星", "price": "320元/晚"}
    ]
    return TextContent(type="text", text=str(hotels))

# --- 启动服务器 ---
if __name__ == "__main__":
    server.run()                       # 启动服务，等待客户端连接
```

---

## 11.6 三种协议对比

| 维度 | MCP | A2A | ANP |
|------|-----|-----|-----|
| 解决的问题 | Agent↔Tool | Agent↔Agent | Agent↔Internet |
| 成熟度 | ⭐⭐⭐⭐ 广泛采用 | ⭐⭐⭐ 快速发展 | ⭐⭐ 早期阶段 |
| 复杂度 | 低 | 中 | 高 |
| 生态 | 丰富（数百个服务器） | 增长中 | 初期 |

---

## 本章小结

### ⚠️ 还缺什么？
通信协议让单个智能体能互相连接。但如何**设计**一个多智能体系统？怎么分配角色？怎么解决冲突？

### ➡️ 下一章
第 12 章：**多智能体系统设计**——从两个 Agent 协作到 N 个 Agent 团队。

---

## 参考文献
- MCP Specification: https://modelcontextprotocol.io
- A2A Protocol: https://github.com/google/A2A
- ANP: https://agentnetworkprotocol.org
