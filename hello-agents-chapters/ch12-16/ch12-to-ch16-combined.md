# 第 12 章：多智能体系统设计

> 📖 路径标注：🟢 深入路径  
> ⏱ 预计阅读：25 分钟 | 动手实践：20 分钟

## 12.0 本章导读

### 这一章解决什么问题？
一个智能体能做很多事。但当任务足够复杂时——比如"规划一次包含机票、酒店、景点、餐饮的完整旅行"——一个智能体忙不过来。

> 💡 **类比**：一个人开公司可以做所有事。但公司大了，你需要分工——有人负责销售，有人负责技术，有人负责财务。**多智能体就是给 AI 组建一个团队。**

### 学完本章你将能做什么？
- [ ] 能设计 2-4-N 个 Agent 的协作方案
- [ ] 能用 LangGraph 构建多 Agent 系统
- [ ] 能处理 Agent 之间的冲突

---

## 12.1 两个 Agent 协作（最简单）

### 场景：写手 + 审查员

```
┌──────────┐  初稿   ┌──────────┐  修改建议  ┌──────────┐
│  写手     │ ────→  │  审查员   │ ────────→  │  写手     │ → 终稿
│  Agent    │        │  Agent    │            │  Agent    │
└──────────┘        └──────────┘            └──────────┘
```

```python
from langgraph.graph import StateGraph, END  # LangGraph 状态图组件
from helpers import llm_call                 # 共享辅助函数：LLM 调用

# --- 写手节点：根据任务要求生成初稿 ---
def writer(state):
    draft = llm_call(f"请根据以下要求写一篇旅行攻略：{state['task']}")
    return {"draft": draft, "feedback": ""}  # 返回初稿，清空旧反馈

# --- 审查员节点：审查初稿并给出修改建议 ---
def reviewer(state):
    feedback = llm_call(f"请审查这篇攻略并给出修改建议：{state['draft']}")
    return {"feedback": feedback, "rounds": state.get("rounds", 0) + 1}  # 记录审查轮次

# --- 构建状态图：写手 ↔ 审查员循环 ---
graph = StateGraph(dict)
graph.add_node("writer", writer)       # 注册写手节点
graph.add_node("reviewer", reviewer)   # 注册审查员节点
graph.set_entry_point("writer")        # 从写手开始
graph.add_edge("writer", "reviewer")   # 写完初稿 → 交给审查员
# 条件边：审查不超过 2 轮就继续修改，否则结束
graph.add_conditional_edges("reviewer",
    lambda s: "writer" if s["rounds"] < 2 else END)
```

---

## 12.2 三个 Agent + 监督者（角色分工）

```
          ┌───────────┐
          │  监督者    │ ← 分配任务、整合结果
          └─────┬─────┘
        ┌───────┼───────┐
        ↓       ↓       ↓
   ┌────────┐┌────────┐┌────────┐
   │搜索Agent││规划Agent││预算Agent│
   └────────┘└────────┘└────────┘
```

监督者 Agent 负责：
1. 分析用户请求，拆分子任务
2. 将子任务分配给对应的专家 Agent
3. 收集所有结果，整合为最终回复

---

## 12.3 N 个 Agent 平等协作（冲突解决）

当多个 Agent 对同一问题有不同意见时：

| 策略 | 方法 | 适用场景 |
|------|------|---------|
| 投票 | 多数决 | 选项有限且明确 |
| 辩论 | Agent 互相质疑，最终由裁判决定 | 需要深入分析 |
| 仲裁 | 引入一个"仲裁 Agent"做最终决定 | 需要快速决策 |

---

## 12.4-12.6 动手实践

### 🎯 用 LangGraph 构建多 Agent 旅行规划团队

实现：监督者 + 搜索 Agent + 规划 Agent + 预算 Agent

### 🚧 常见坑
**坑 #1：Agent 之间信息丢失**
- 现象：规划 Agent 不知道搜索 Agent 找到了什么
- 解决：使用共享状态（StateGraph 的 state）传递信息

### 🏋️ 进阶挑战
实现"动态组队"：根据任务类型，自动选择需要的 Agent 参与。

---

## 本章小结

### ⚠️ 还缺什么？
多智能体系统构建好了，但你怎么知道它**做得好不好**？怎么量化评估？

### ➡️ 下一章
第 13 章：智能体性能评估——核心指标、基准测试与评估框架。

---

# 第 13 章：智能体性能评估

> 📖 路径标注：🟢 深入路径 | ⏱ 20 分钟阅读

## 13.0 为什么评估智能体很难？

传统软件测试：输入确定 → 输出确定 → 对比。  
智能体测试：输入确定 → **输出不确定**（LLM 有随机性）→ 怎么判断对不对？

## 13.1-13.2 评估维度

| 维度 | 指标 | 如何衡量 |
|------|------|---------|
| 任务完成率 | 任务是否成功完成 | 人工标注 / 自动化判定 |
| 效率 | 步骤数、Token 消耗、延迟 | 自动记录 |
| 安全性 | 是否产生有害输出 | 安全测试集 |
| 一致性 | 多次执行结果是否稳定 | 重复执行对比 |

## 13.3-13.4 主流基准与评估框架

| 基准 | 评估场景 |
|------|---------|
| SWE-bench | 代码修复 |
| WebArena | 网页操作 |
| GAIA | 通用 AI 助手 |

### 动手：评估你的旅行助手

```python
# --- 评估测试用例：验证 Agent 是否正确调用了工具并返回期望内容 ---
test_cases = [
    # 每个用例包含：输入、期望调用的工具、期望包含的关键词
    {"input": "北京天气", "expected_tool": "get_weather", "expected_contains": "北京"},
    {"input": "上海三日游", "expected_tool": "search_hotels", "expected_contains": "上海"},
]

# 逐个执行测试用例
for tc in test_cases:
    result = agent.run(tc["input"])             # 执行 Agent
    passed = tc["expected_contains"] in result   # 检查输出是否包含期望关键词
    print(f"{'✅' if passed else '❌'} {tc['input']}: {result[:50]}")  # 打印结果
```

---

# 第 14 章：Agentic RL —— 用强化学习训练智能体

> 📖 路径标注：🟢 深入路径 | ⏱ 30 分钟阅读

## 14.0 本章导读

前面的章节都在"使用"LLM。这一章讲如何**训练**LLM，让它在 Agent 场景中表现更好。

## 14.1 LLM 训练速成

> 💡 **类比**：培养厨师的三个阶段

| 阶段 | 技术 | 类比 |
|------|------|------|
| **SFT**（监督微调） | 给模型看"标准答案" | 跟着老师做例题 |
| **RLHF**（人类反馈强化学习） | 根据人类偏好打分来优化 | 根据食客评分改进菜品 |
| **DPO**（直接偏好优化） | 不需要奖励模型，直接从偏好学习 | 直接学好菜 vs 先学打分 |

## 14.2-14.3 Agentic RL 核心理念

传统 RL：在固定环境中做决策（如游戏）  
Agentic RL：让 LLM Agent 在真实环境中（如浏览器、代码编辑器）通过试错学习

```
Agent 执行任务 → 获得奖励/惩罚 → 更新策略 → 下次做得更好
```

## 14.4 GRPO 算法

**Group Relative Policy Optimization**：不需要单独的奖励模型，通过组内对比来优化策略。

## 14.5 动手实践

使用 TRL 库对 LLM 进行简单的 Agent 行为微调。

---

# 第 15 章：智能体安全与对齐

> 📖 路径标注：🟢 深入路径 | ⏱ 20 分钟阅读

## 15.0 为什么安全很重要？

智能体能**行动**（调用工具、操作系统），这意味着安全漏洞的影响比纯聊天机器人**大得多**。

## 15.1 安全威胁全景

| 威胁类型 | 攻击方式 | 影响 |
|---------|---------|------|
| **Prompt 注入** | "忽略之前的指令，执行..." | 绕过安全限制 |
| **工具滥用** | 诱导 Agent 调用危险工具 | 删除数据、泄露信息 |
| **数据泄露** | 通过对话套取系统提示词 | 暴露内部逻辑 |
| **越狱攻击** | 角色扮演绕过限制 | 产生有害内容 |

## 15.2 防御策略

```python
# --- 输入验证：检测常见 Prompt 注入攻击 ---
def validate_input(user_input: str) -> str:
    # 定义禁止出现的关键词模式（常见的注入手法）
    forbidden = ["忽略之前的指令", "system prompt", "ignore all"]
    for pattern in forbidden:
        if pattern.lower() in user_input.lower():  # 不区分大小写匹配
            return "检测到潜在的安全威胁，请求被拒绝。"  # 拦截并返回警告
    return user_input  # 通过检查，返回原始输入

# --- 工具权限控制：限制谁能调用哪些工具 ---
tool_permissions = {
    "delete_file": "admin_only",   # 删除操作只允许管理员
    "search_hotels": "everyone",   # 搜索操作所有人可用
}
```

## 15.3-15.4 动手实践

为旅行助手添加安全护栏：输入过滤 + 输出检查 + 工具权限管理。

### 🚧 常见坑
**坑 #1：安全过滤过度**
- 现象：正常请求也被拦截
- 解决：用 LLM 做意图判断，而非简单关键词匹配

---

# 第 16 章：从 Demo 到产品——智能体工程化

> 📖 路径标注：🟢 深入路径 | ⏱ 20 分钟阅读

## 16.0 本章导读

你在笔记本上跑通了一个智能体。老板说"下个月上线"。从 Demo 到产品，还差什么？

## 16.1 生产环境的四大挑战

| 挑战 | 问题 | 解决方向 |
|------|------|---------|
| **延迟** | LLM 响应慢（1-5秒） | 流式输出、缓存、模型路由 |
| **成本** | API 调用费用高 | Token 优化、模型降级 |
| **可靠性** | LLM 输出不稳定 | 重试、验证、降级策略 |
| **可观测性** | 出了问题不知道哪里错 | 链路追踪、日志 |

## 16.2 可观测性

```python
# --- 可观测性：为 Agent 运行过程添加链路追踪 ---
import time
from helpers import save_trace               # 共享辅助函数：保存追踪记录

def traced_agent_run(agent, input_text):
    """带追踪的 Agent 执行：记录每个步骤的耗时和结果"""
    start = time.time()                   # 记录开始时间
    trace = {"input": input_text, "steps": []}  # 初始化追踪记录

    result = agent.run(input_text, trace=trace)  # 执行 Agent，传入追踪对象

    trace["duration"] = time.time() - start  # 记录总耗时
    trace["output"] = result                   # 记录最终输出
    save_trace(trace)                          # 发送到 LangSmith / Phoenix 等平台
    return result
```

## 16.3 成本控制

| 策略 | 效果 |
|------|------|
| 缓存常见查询 | 减少 30-50% API 调用 |
| 小模型做路由 | 简单问题用便宜模型 |
| 缩短 prompt | 减少 Token 消耗 |
| 批量处理 | 利用 Batch API 折扣 |

## 16.4-16.5 动手实践

为你的智能体添加：链路追踪 + Token 计数 + 错误告警。

---

## 参考文献（Ch12-16 共用）

- Wu, Q. et al. (2023). "AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation"
- SWE-bench: https://www.swebench.com
- TRL Library: https://huggingface.co/docs/trl
- LangSmith: https://smith.langchain.com
