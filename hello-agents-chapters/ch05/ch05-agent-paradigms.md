# 第 5 章：智能体思维范式

> 📖 路径标注：🟢 深入路径必读  
> ⏱ 预计阅读：30 分钟 | 动手实践：20 分钟

---

## 5.0 本章导读

### 这一章解决什么问题？

上一章我们给旅行助手装上了"手"（工具调用），它能查天气、搜酒店了。但它的思考方式还很"直线"——收到问题就直接行动。

如果你说"帮我规划一个上海三日游"，它会一股脑输出文字。而一个更聪明的助手会这样做：
1. 先查三天的天气
2. 根据天气规划每天的活动
3. 搜索附近的酒店
4. 整合成完整行程

**同样的工具，不同的"思考方式"，结果天差地别。** 本章将介绍三种主流的思维范式。

### 前置知识

- ✅ 第 4 章 —— 你需要知道工具调用的实现方式

### 学完本章你将能做什么？

- [ ] 能实现 ReAct、Plan-and-Solve、Reflection 三种范式
- [ ] 能根据任务特点选择合适的范式
- [ ] 能用 Plan-and-Solve 让旅行助手规划行程

---

## 5.1 ReAct：推理与行动交织

### 核心思想

**ReAct = Reasoning + Acting**。智能体在每一步中先"想一想"（推理），再"做一做"（行动），然后"看一看"（观察结果），如此循环。

```
Thought（思考）："用户问上海天气，我需要调用 get_weather 工具"
   ↓
Action（行动）：调用 get_weather(city="上海")
   ↓
Observation（观察）：返回结果 "上海，28°C，多云"
   ↓
Thought："好的，我拿到了天气信息，可以回复用户了"
   ↓
Final Answer："上海今天 28°C，多云，适合出行"
```

> 💡 **类比**：做菜时的过程——看食谱想想下一步（Thought）→ 切菜/炒菜（Action）→ 尝一口看看味道（Observation）→ 再想下一步...

### ReAct 的代码实现

```python
from helpers import llm_call, parse_action, execute_tool  # 共享辅助函数（见 helpers.py）

def react_agent(question: str, tools: list, max_steps: int = 5):
    """ReAct 模式：边想边做，每步包含 思考(Thought) → 行动(Action) → 观察(Observation)"""
    history = []                         # 记录每步的思考、行动、观察

    for step in range(max_steps):        # 最多执行 max_steps 步
        # 构造 prompt，包含历史：让 LLM 知道之前做了什么
        prompt = f"""请根据以下格式回答问题：
Thought: [你的思考]
Action: [工具名]([参数JSON])
Observation: [工具返回的结果]
...（可循环多次）
Final Answer: [最终回答]

可用工具：{[t['function']['name'] for t in tools]}
问题：{question}
历史：{history}
"""
        response = llm_call(prompt)      # 让 LLM 决定下一步

        # 如果 LLM 给出了最终答案，结束循环
        if "Final Answer:" in response:
            return response.split("Final Answer:")[1].strip()

        # 否则解析 LLM 输出中的 Action，执行对应工具
        action = parse_action(response)  # 提取工具名和参数
        observation = execute_tool(action["name"], action["args"])  # 执行工具

        # 将本轮的思考、行动、观察记录到历史中
        history.append({"thought": response, "action": action, "observation": observation})

    return "达到最大步数，未能完成任务"  # 安全阀
```

### ReAct 的特点

| 优点 | 缺点 |
|------|------|
| 灵活，能动态调整策略 | 可能陷入循环 |
| 适合探索性任务 | 每步都要调用 LLM，成本高 |
| 可解释（能看到思考过程） | 复杂任务容易"迷路" |

---

## 5.2 Plan-and-Solve：先想后做

### 核心思想

分两阶段：**先让 LLM 制定完整计划，再逐步执行。** 就像旅行前做好行程表，然后按天执行。

```
Phase 1 规划：
   "上海三日游"计划：
   Day1: 查天气 → 搜索外滩附近酒店 → 预订
   Day2: 查迪士尼门票 → 规划路线
   Day3: 搜索南京路购物推荐 → 计算总预算

Phase 2 执行：
   按计划逐步调用工具，填充每个步骤的详细信息
```

> 💡 **类比**：先做行程表，再按天执行。ReAct 是"走一步看一步"，Plan-and-Solve 是"先做好攻略再出发"。

### Plan-and-Solve 的代码实现

```python
from helpers import llm_call, parse_plan, execute_tool  # 共享辅助函数

def plan_and_solve(task: str, tools: list):
    """Plan-and-Solve 模式：先制定完整计划，再逐步执行"""

    # --- Phase 1：规划 ---
    # 让 LLM 将任务拆解为具体步骤，每步标注需要调用的工具
    plan_prompt = f"""请将以下任务分解为具体步骤，每步标注需要调用的工具：
任务：{task}
可用工具：{[t['function']['name'] for t in tools]}

输出格式：
Step 1: [描述] - 工具: [工具名] - 参数: [JSON]
Step 2: ...
"""
    plan = llm_call(plan_prompt)          # LLM 生成计划
    steps = parse_plan(plan)              # 解析计划为结构化数据

    # --- Phase 2：逐步执行 ---
    results = []                          # 存储每步的执行结果
    for i, step in enumerate(steps):
        result = execute_tool(step["tool"], step["args"])  # 按计划调用工具
        results.append({"step": i+1, "description": step["desc"], "result": result})

    # --- Phase 3：整合结果 ---
    # 将所有步骤的执行结果交给 LLM，生成最终回答
    summary_prompt = f"根据以下执行结果，生成最终回答：\n任务：{task}\n结果：{results}"
    return llm_call(summary_prompt)
```

### Plan-and-Solve 的特点

| 优点 | 缺点 |
|------|------|
| 全局规划，不遗漏步骤 | 规划可能有误 |
| 适合多步骤复杂任务 | 无法根据中间结果调整计划 |
| LLM 调用次数少，成本低 | 不适合探索性任务 |

---

## 5.3 Reflection：从错误中学习

### 核心思想

智能体执行完任务后，**反思自己的表现**，把经验存入记忆，下次遇到类似任务时做得更好。

```
执行任务 → 评估结果 → 反思（哪里做得好？哪里可以改进？）→ 保存经验

示例：
执行："帮我推荐上海餐厅" → 推荐了 3 家
反思："用户没有说预算，我应该先询问预算再推荐"
保存经验："推荐餐厅时，先确认预算和口味偏好"
```

> 💡 **类比**：考试后对答案——做错的题记在错题本上，下次不再犯同样的错误。

### Reflection 的代码实现

```python
from helpers import llm_call, save_to_memory  # 共享辅助函数

def reflection_agent(task: str, result: str):
    """Reflection 模式：执行完成后反思，把经验存入记忆"""

    # 反思：让 LLM 评估结果质量，找出改进点
    reflect_prompt = f"""请评估以下任务执行结果的质量（1-10分），并指出改进点：
任务：{task}
结果：{result}

输出格式：
评分：[分数]
做得好的：[列表]
需要改进的：[列表]
经验教训：[下次遇到类似任务的建议]
"""
    reflection = llm_call(reflect_prompt)  # LLM 生成反思结果

    # 将反思经验保存到记忆系统（Ch6 会详细讲记忆实现）
    save_to_memory(reflection)

    return reflection                      # 返回反思结果
```

---

## 5.4 三种范式对比与选型指南

| 维度 | ReAct | Plan-and-Solve | Reflection |
|------|-------|---------------|------------|
| 思考方式 | 边想边做 | 先想后做 | 做完再想 |
| LLM 调用次数 | 多（每步一次） | 少（规划+总结） | 中（执行+反思） |
| 适合任务 | 探索性、不确定 | 多步骤、结构化 | 需要持续改进的 |
| 典型场景 | "帮我查一下..." | "帮我规划三日游" | "帮我写一篇文章并改进" |
| 成本 | 高 | 低 | 中 |

### 组合策略

在实际应用中，三种范式经常**组合使用**：

```
Plan-and-Solve + ReAct：
  先制定整体计划（Plan）
  每个步骤用 ReAct 灵活执行

ReAct + Reflection：
  用 ReAct 完成任务
  完成后反思，优化下次的策略
```

---

## 5.5 综合实践：构建完整单智能体

### 旅行助手 v0.3

让我们把 Plan-and-Solve 集成到旅行助手中：

```python
from helpers import llm_call, execute_plan_steps  # 共享辅助函数

def travel_planner(destination: str, days: int, tools: list):
    """旅行助手 v0.3：用 Plan-and-Solve 规划旅行"""

    # --- Phase 1：制定计划 ---
    plan = llm_call(f"""请为"{days}天{destination}游"制定详细计划。
每天列出 2-3 个活动，标注需要用到的工具。
可用工具：{[t['function']['name'] for t in tools]}""")

    print("📋 旅行计划：")
    print(plan)                           # 展示计划给用户确认

    # --- Phase 2：执行计划（简化版，按计划逐步调用工具）---
    results = execute_plan_steps(plan, tools)

    # --- Phase 3：整合计划 + 执行结果，生成完整指南 ---
    final = llm_call(f"根据以下计划和执行结果，生成完整的旅行指南：\n{plan}\n{results}")
    return final
```

---

## 动手实践

### 🎯 三种范式对比实验

用同一个任务"帮我了解上海迪士尼乐园"分别用三种方式处理：

1. **ReAct**：先搜天气，再搜门票，再搜交通
2. **Plan-and-Solve**：先列出 5 个需要了解方面，再逐步查
3. **Reflection**：用 ReAct 完成后，反思遗漏

### 🚧 常见坑

**坑 #1：ReAct 死循环**
- 现象：智能体反复调用同一个工具，永远不到 "Final Answer"
- 原因：LLM 对结果不满意但没有退出策略
- 解决：设置 `max_steps` 上限（通常 5-10 步）

**坑 #2：Plan-and-Solve 的计划不可执行**
- 现象：计划中包含不存在的工具或无法获取的信息
- 原因：LLM 在规划时"想象"了不存在的能力
- 解决：在规划 prompt 中明确列出可用工具

### 🏋️ 进阶挑战

实现一个 Plan-and-Solve + Reflection 的组合：先规划行程，执行后反思"这个行程是否合理？有没有太赶？"

---

## 本章小结

### 📦 本章成果

旅行助手升级为 **v0.3**——它现在能先规划行程再逐步执行，而不是一股脑输出文字。

### 🗂 知识卡片

| 概念 | 一句话解释 | 类比 |
|------|-----------|------|
| ReAct | 边想边做，循环执行 | 做菜时看食谱→切菜→尝→调整 |
| Plan-and-Solve | 先完整规划，再逐步执行 | 先做行程表再出发 |
| Reflection | 做完后反思，积累经验 | 考试后总结错题本 |

### ⚠️ 还缺什么？

我们的旅行助手现在能思考、能行动、能规划。但它有一个严重问题——**每次新对话都"失忆"**。你告诉它"我喜欢靠窗的座位"，下次对话它又问一遍。它没有记忆。

### ➡️ 下一章预告

第 6 章将为智能体添加**记忆系统**——让它不仅能思考，还能记住。我们将学习短期记忆、长期记忆、向量数据库，以及 RAG（检索增强生成）。旅行助手将升级为 v0.4，能记住你的偏好。

---

## 习题

1. **[概念理解]** 什么类型的任务适合 ReAct？什么类型适合 Plan-and-Solve？各举一个例子。
2. **[概念理解]** Reflection 机制增加了额外的 LLM 调用成本。在什么场景下这个成本是值得的？
3. **[动手实践]** 用 ReAct 实现一个"信息搜集"任务：搜集某个城市的天气、景点和美食。
4. **[动手实践]** 用 Plan-and-Solve 实现旅行助手 v0.3 的完整规划功能，测试"北京三日游"。
5. **[开放思考]** 如果 Reflection 的经验积累足够多，智能体会不会"越来越聪明"？这和传统的机器学习有什么关系？

---

## 参考文献

- Yao, S. et al. (2022). "ReAct: Synergizing Reasoning and Acting in Language Models"
- Wang, L. et al. (2023). "Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning"
- Shinn, N. et al. (2023). "Reflexion: Language Agents with Verbal Reinforcement Learning"
