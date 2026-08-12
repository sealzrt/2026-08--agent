# 第 17 章：智能旅行助手——综合实战

> 📖 路径标注：🟢 深入路径  
> ⏱ 预计阅读：35 分钟 | 动手实践：60 分钟

## 17.0 本章导读

这是贯穿全书的**旅行助手 v1.0**——将前面 16 章学到的所有知识整合为一个完整项目。

### 知识回顾：这个项目用到了哪些章节的知识？

| 功能 | 对应章节 |
|------|---------|
| 基础对话 | Ch1（初识智能体） |
| LLM 调用 | Ch3（大语言模型原理） |
| 天气/酒店/地图工具 | Ch4（工具调用） |
| 行程规划（Plan-and-Solve） | Ch5（思维范式） |
| 用户偏好记忆 | Ch6（记忆系统） |
| 上下文组装 | Ch7（上下文工程） |
| LangGraph 编排 | Ch9（框架使用） |
| Agent 框架设计 | Ch10（自建框架） |
| MCP 高德地图集成 | Ch11（通信协议） |
| 多 Agent 协作 | Ch12（多智能体系统） |
| 安全护栏 | Ch15（安全与对齐） |

---

## 17.1 项目概述与架构设计

### 系统架构

```
用户界面（Web / CLI）
       ↓
┌─────────────────────────────────────────┐
│  编排层（LangGraph 状态图）               │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│  │ 规划Agent │→│ 执行Agent │→│ 整合Agent │  │
│  └─────────┘ └─────────┘ └──────────┘  │
├─────────────────────────────────────────┤
│  工具层（MCP 协议）                       │
│  ┌────────┐ ┌────────┐ ┌────────────┐  │
│  │天气MCP  │ │酒店MCP  │ │高德地图MCP  │  │
│  └────────┘ └────────┘ └────────────┘  │
├─────────────────────────────────────────┤
│  记忆层                                  │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │ 对话记忆      │  │ 用户偏好（向量库） │  │
│  └──────────────┘  └─────────────────┘  │
├─────────────────────────────────────────┤
│  安全层                                  │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │ 输入过滤      │  │ 权限控制         │  │
│  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 17.2 数据模型设计（Pydantic）

```python
# --- 用 Pydantic 定义数据模型，确保数据结构规范 ---
from pydantic import BaseModel           # 数据验证基类
from typing import List, Optional        # 类型提示
from datetime import date                # 日期类型

# 用户请求模型：描述一次旅行的需求
class TripRequest(BaseModel):
    destination: str                     # 目的地
    start_date: date                     # 出发日期
    end_date: date                       # 返回日期
    budget: Optional[float] = None       # 预算（可选）
    travelers: int = 1                   # 出行人数，默认 1
    preferences: List[str] = []          # 偏好列表（如"靠窗"、"经济舱"）

# 酒店模型
class Hotel(BaseModel):
    name: str                            # 酒店名
    price_per_night: float               # 每晚价格
    rating: float                        # 评分
    address: str                         # 地址

# 单日行程模型
class DayPlan(BaseModel):
    date: date                           # 日期
    activities: List[str]                # 活动列表
    meals: List[str]                     # 餐饮安排
    transport: str                       # 交通方式
    estimated_cost: float                # 预估费用

# 完整行程计划模型（包含多个单日行程 + 多个酒店）
class TripPlan(BaseModel):
    destination: str                     # 目的地
    days: List[DayPlan]                  # 每日行程
    hotels: List[Hotel]                  # 推荐酒店
    total_budget: float                  # 总预算
    weather_summary: str                 # 天气摘要
```

---

## 17.3 多智能体协作设计

三个 Agent 分工：

| Agent | 职责 | 使用的工具 |
|-------|------|-----------|
| **规划 Agent** | 分析需求，制定行程框架 | 无（纯推理） |
| **执行 Agent** | 查天气、搜酒店、查地图 | MCP 工具集 |
| **整合 Agent** | 将所有结果整合为完整行程 | 无（纯推理） |

```python
from helpers import llm_call, mcp_call  # 共享辅助函数
from langgraph.graph import StateGraph, END  # LangGraph 状态图组件
from typing import TypedDict, List           # 类型定义

# --- 定义多 Agent 共享的状态类型 ---
class TravelState(TypedDict):
    request: TripRequest               # 用户请求
    plan_outline: str                  # 行程框架（规划 Agent 产出）
    weather: dict                      # 天气数据（执行 Agent 产出）
    hotels: List[Hotel]                # 酒店数据
    routes: dict                       # 交通路线
    final_plan: TripPlan               # 最终行程（整合 Agent 产出）

# --- 规划 Agent：分析需求，制定行程框架 ---
def planner(state: TravelState) -> dict:
    outline = llm_call(f"根据以下需求制定行程框架：{state['request']}")
    return {"plan_outline": outline}   # 输出行程大纲，交给执行 Agent

# --- 执行 Agent：调用 MCP 工具获取实时数据 ---
def executor(state: TravelState) -> dict:
    # 并行调用三个 MCP 工具
    weather = mcp_call("get_weather", {"city": state["request"].destination})
    hotels = mcp_call("search_hotels", {"city": state["request"].destination})
    routes = mcp_call("get_routes", {"from": "home", "to": state["request"].destination})
    return {"weather": weather, "hotels": hotels, "routes": routes}

# --- 整合 Agent：将所有信息合并为完整行程 ---
def integrator(state: TravelState) -> dict:
    plan = llm_call(f"""整合以下信息，生成完整的旅行计划：
    行程框架：{state['plan_outline']}
    天气：{state['weather']}
    酒店：{state['hotels']}
    交通：{state['routes']}""")
    return {"final_plan": plan}

# --- 构建状态图：规划 → 执行 → 整合（流水线）---
graph = StateGraph(TravelState)
graph.add_node("planner", planner)         # 注册规划节点
graph.add_node("executor", executor)       # 注册执行节点
graph.add_node("integrator", integrator)   # 注册整合节点
graph.set_entry_point("planner")           # 从规划开始
graph.add_edge("planner", "executor")      # 规划完 → 执行
graph.add_edge("executor", "integrator")   # 执行完 → 整合
graph.add_edge("integrator", END)          # 整合完 → 结束

travel_app = graph.compile()               # 编译状态图
```

---

## 17.4 MCP 工具集成

### 高德地图 MCP 服务器

```python
# --- 高德地图 MCP 服务器：封装高德 API 为 MCP 工具 ---
from mcp.server import Server              # MCP 服务器基类
import httpx                               # 异步 HTTP 客户端

server = Server("amap-tools")              # 创建服务器实例
AMAP_KEY = os.getenv("AMAP_API_KEY")       # 从环境变量读取高德 API Key

# --- 工具 1：查询两地之间的交通路线 ---
@server.tool("get_routes")
async def get_routes(origin: str, destination: str):
    """查询两地之间的交通路线"""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://restapi.amap.com/v3/direction/driving",  # 高德驾车路线 API
            params={"origin": origin, "destination": destination, "key": AMAP_KEY}
        )
        return resp.json()                 # 返回高德 API 的 JSON 结果

# --- 工具 2：搜索城市中的兴趣点（POI）---
@server.tool("search_poi")
async def search_poi(city: str, keyword: str):
    """搜索城市中的兴趣点（餐厅、景点等）"""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://restapi.amap.com/v3/place/text",  # 高德 POI 搜索 API
            params={"city": city, "keywords": keyword, "key": AMAP_KEY}
        )
        return resp.json()
```

---

## 17.5 Web 前端与交互

推荐使用 **Streamlit** 快速搭建前端：

```python
# --- 用 Streamlit 快速搭建 Web 前端 ---
import streamlit as st                    # Streamlit Web 框架
from datetime import date, timedelta      # 日期类型 + 时间差计算

st.title("🌍 AI 旅行助手")                # 页面标题

# 用户输入表单
destination = st.text_input("目的地", "上海")       # 文本输入，默认"上海"
days = st.number_input("天数", 1, 14, 3)           # 数字输入，1-14 天，默认 3
budget = st.number_input("预算（元）", 1000, 50000, 5000)  # 预算范围

# 点击"生成行程"按钮时触发
if st.button("生成行程"):
    with st.spinner("规划中..."):          # 显示加载动画
        result = travel_app.invoke({       # 调用 LangGraph 状态图
            "request": TripRequest(
                destination=destination,
                start_date=date.today(),
                end_date=date.today() + timedelta(days=days),
                budget=budget
            )
        })
    st.json(result["final_plan"])          # 以 JSON 格式展示最终行程
```

---

## 17.6 项目复盘：设计模式提炼

| 模式 | 在本项目中的应用 | 通用场景 |
|------|----------------|---------|
| 流水线模式 | planner → executor → integrator | 任何多步骤任务 |
| 工具代理模式 | MCP 服务器封装外部 API | 任何外部服务集成 |
| 关注点分离 | 数据模型 / 编排 / 工具 / 安全 四层分离 | 任何复杂系统 |

---

# 第 18 章：综合进阶项目

## 18.1 DeepResearch Agent：自动化深度研究

### 项目目标

给定一个研究课题，Agent 自动：
1. 拆解为多个子问题
2. 对每个子问题进行搜索和信息收集
3. 反思信息是否充分，不充分则补充搜索
4. 整合所有信息，生成深度研究报告

### 架构

```
研究请求 → [拆解Agent] → 子问题列表
                              ↓
                    [搜索Agent] × N（并行）
                              ↓
                    [反思Agent] → 信息充分？
                              ↓ 不充分则回到搜索
                    [写作Agent] → 研究报告
```

### 核心代码

```python
from helpers import llm_call, mcp_call  # 共享辅助函数：LLM 调用 + 工具调用

def research_agent(topic: str, max_rounds: int = 3):
    """深度研究 Agent：拆解问题 → 搜索 → 反思 → 生成报告"""

    # 第一步：用 LLM 将大课题拆解为多个子问题
    sub_questions = llm_call(f"将以下研究课题拆解为 5 个子问题：{topic}")

    # 第二+三步：搜索 + 反思循环（最多 max_rounds 轮）
    collected_info = []                  # 收集所有搜索到的信息
    for round in range(max_rounds):
        # 对每个子问题并行搜索
        for q in sub_questions:
            info = search_tool(q)        # 调用搜索工具获取信息
            collected_info.append(info)

        # 反思：让 LLM 判断信息是否足够
        reflection = llm_call(f"以下信息是否足以回答：{topic}？信息：{collected_info}")
        if "充分" in reflection:
            break                        # 信息充足，跳出循环
        # 信息不足，生成补充问题继续搜索
        sub_questions = llm_call("还需要补充哪些信息？")

    # 第四步：基于收集的全部信息生成深度报告
    report = llm_call(f"基于以下信息，撰写深度研究报告：{collected_info}")
    return report
```

---

## 18.2 赛博小镇：多智能体社会模拟

### 项目目标

创建一个虚拟小镇，每个 NPC 是一个独立的 LLM Agent，有自己的性格、记忆和目标。观察它们如何互动、合作、竞争。

### 核心设计

```python
# --- 赛博小镇：每个 NPC 是一个独立的 LLM Agent ---
class TownAgent:
    def __init__(self, name: str, personality: str, goals: list):
        self.name = name                 # NPC 名称
        self.personality = personality   # 性格特征
        self.goals = goals               # 目标列表
        self.memory = []                 # 独立记忆（每个 NPC 记忆不同）
        self.relationships = {}          # 与其他 NPC 的关系强度

    def perceive(self, event: str):
        """感知环境事件：将事件记录到记忆中"""
        self.memory.append({"event": event, "time": now()})

    def think(self) -> str:
        """思考节点：基于性格、目标、记忆决定行动"""
        return llm_call(f"""你是{self.name}，性格：{self.personality}。
        目标：{self.goals}
        记忆：{self.memory[-5:]}          # 只取最近 5 条记忆
        你现在要做什么？""")

    def interact(self, other_agent: 'TownAgent') -> str:
        """与另一个 NPC 互动：生成对话内容"""
        return llm_call(f"{self.name}对{other_agent.name}说：...")

# --- 创建小镇居民 ---
agents = [
    TownAgent("小明", "热情开朗", ["交到新朋友"]),   # 外向型
    TownAgent("小红", "安静内向", ["安静地读书"]),   # 内向型
    TownAgent("老王", "热心肠", ["帮助邻居"]),       # 利他型
]
```

---

## 18.3 两种系统的设计对比

| 维度 | DeepResearch Agent | 赛博小镇 |
|------|-------------------|---------|
| 信息流 | 单向：搜索→整合→报告 | 网状：Agent 之间多向交互 |
| Agent 数量 | 固定（3-4 个角色） | 动态（可增减 NPC） |
| 目标 | 单一目标（完成报告） | 多目标（每个 NPC 有自己的目标） |
| 复杂度来源 | 信息收集深度 | 社会交互复杂度 |
| 适用场景 | 研究、分析 | 游戏、社会模拟 |

---

## 18.4 毕业设计指南

### 选题方向（10 个参考）

1. **智能客服系统**：多 Agent 协作处理用户问题
2. **代码审查助手**：分析 PR、生成审查意见
3. **个人知识管理**：自动整理笔记、建立知识图谱
4. **自动化测试生成**：分析需求、生成测试用例
5. **会议纪要助手**：录音转文字、提取行动项
6. **论文阅读助手**：摘要、问答、关联分析
7. **社交媒体管理**：自动发布、互动回复
8. **数据分析助手**：自然语言查询数据库
9. **学习辅导员**：个性化学习路径、知识检测
10. **家庭助手**：日程管理、购物清单、食谱推荐

### 评分维度

| 维度 | 权重 | 标准 |
|------|------|------|
| 功能完整度 | 30% | 是否完成了核心功能 |
| 技术深度 | 25% | 是否使用了多种 Agent 技术 |
| 代码质量 | 20% | 结构清晰、注释完善 |
| 创新性 | 15% | 是否有独特的设计或应用场景 |
| 文档完善度 | 10% | README、使用说明是否完整 |

---

## 18.5 智能体的未来展望

### 当前趋势

1. **Agent 原生应用**：不再是"AI+现有软件"，而是从头为 Agent 设计的应用
2. **标准化协议**：MCP/A2A 正在成为行业标准
3. **开源 Agent 框架成熟**：LangGraph、AutoGen 等逐步稳定
4. **安全与对齐**：随着 Agent 能力增强，安全问题日益重要

### 开放问题

- Agent 能否真正"理解"任务，还是只是高级模式匹配？
- 多 Agent 系统的涌现行为是否可控？
- Agent 的自主性边界在哪里？

---

## 全书结语

恭喜你完成了从"初识智能体"到"构建完整多 Agent 系统"的完整旅程。

回顾旅行助手的成长之路：

```
v0.1  只会对话          ← Ch1
v0.2  能查天气搜酒店     ← Ch4
v0.3  能规划行程         ← Ch5
v0.4  能记住你的偏好     ← Ch6
v0.5  用框架编排         ← Ch9
v0.6  多Agent协作        ← Ch12
v1.0  完整的MCP集成版    ← Ch17
```

每一步都是在**前一步的基础上**添加一个新能力。这就是智能体开发的本质：**渐进式构建，逐步增强。**

现在，去构建你自己的智能体吧。

---

## 参考文献

- Park, J.S. et al. (2023). "Generative Agents: Interactive Simulacra of Human Behavior"
- Saran, S. et al. (2024). "DeepResearch: Autonomous Research Agent"
- Datawhale Hello-Agents: https://github.com/datawhalechina/Hello-Agents
