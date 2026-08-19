# 元认知设计模式：让 Agent "思考自己的思考"

来源：Microsoft Learn 开源课程 [AI Agents for Beginners - Metacognition in AI Agents](https://github.com/microsoft/ai-agents-for-beginners/blob/main/09-metacognition/README.md)

> 本文是对原英文课程的中文整理版，不是逐字翻译。目标是帮助中文读者理解元认知（Metacognition）在 AI Agent 中的作用，掌握纠错式 RAG、意图搜索、代码生成 Agent 等自我修正技术。

## 1. 这节课要解决什么问题

元认知（Metacognition）即"对思考的思考"（thinking about thinking）——一种更高阶的认知过程，指系统能够觉察、监控、调节和适应自己的内部推理过程。对 AI Agent 来说，就是基于自我觉察和过往经验来评估并调整自己的行为。

学完本课你应该能够：

1. 理解推理循环（reasoning loop）在 Agent 定义中的意义。
2. 使用规划与评估技术帮助 Agent 实现自我纠错。
3. 创建能通过操纵代码来完成任务的 Agent。

元认知能帮助 Agent 系统应对以下挑战：

- **透明性**：能解释自己的推理和决策。
- **推理**：更好地综合信息、做出合理决策。
- **适应**：适应新环境和变化的条件。
- **感知**：更准确地识别和解读环境数据。

### 什么是"真正的元认知"

真正的元认知是 AI 显式地对自己的推理过程进行推理。例如：

- "我优先选了便宜航班……但这可能漏掉直飞航班，我重新检查一下。"
- 记录自己为什么选了某条路线。
- 意识到"上次过度依赖了用户历史偏好导致出错"，于是修改的是**决策策略**而不只是最终推荐结果。
- 诊断出模式："每当用户提到'太拥挤'，我不仅应该剔除某些景点，还应该反思——如果我总是按热门度排序，那我挑选'热门景点'的方法本身就有缺陷。"

### 元认知为什么重要

- **自我反思**：Agent 能评估自身表现，找出改进空间。
- **适应性**：根据过往经验和环境变化调整策略。
- **纠错**：自主发现并纠正错误，输出更准确。
- **资源管理**：通过规划和评估动作，优化时间与算力的使用。

## 2. Agent 的基本组成与旅行 Agent 示例

一个 AI Agent 通常由三部分构成一个"专业单元"（expertise unit）：

- **Persona（人设）**：Agent 的个性与特征，决定它如何与用户交互。
- **Tools（工具）**：Agent 能执行的能力和功能。
- **Skills（技能）**：Agent 拥有的知识和专长。

### 示例：带元认知的旅行 Agent

设想一个帮用户规划巴黎之行的 "Travel Agent"，任务分四步：收集用户偏好 → 检索信息（航班/住宿/景点/餐厅）→ 生成个性化行程 → 根据反馈调整。元认知体现在：

1. **分析用户反馈**：复盘哪些推荐受欢迎、哪些不受欢迎，调整后续建议。
2. **适应性**：用户曾表示不喜欢拥挤的地方，以后就避开高峰时段的热门景点。
3. **纠错**：曾推荐过已满房的酒店，就学会在推荐前更严格地核查可用性。

简化代码骨架：

```python
class Travel_Agent:
    def __init__(self):
        self.user_preferences = {}
        self.experience_data = []   # 经验数据：积累历史反馈

    def gather_preferences(self, preferences):
        self.user_preferences = preferences

    def retrieve_information(self):
        # 按偏好检索航班、酒店、景点
        flights = search_flights(self.user_preferences)
        hotels = search_hotels(self.user_preferences)
        attractions = search_attractions(self.user_preferences)
        return flights, hotels, attractions

    def generate_recommendations(self):
        flights, hotels, attractions = self.retrieve_information()
        itinerary = create_itinerary(flights, hotels, attractions)
        return itinerary

    def adjust_based_on_feedback(self, feedback):
        self.experience_data.append(feedback)
        # 分析反馈并调整偏好，影响未来推荐
        self.user_preferences = adjust_preferences(self.user_preferences, feedback)
```

## 3. Agent 中的规划（Planning）

规划是 Agent 行为的关键组成：明确目标、考虑当前状态/资源/可能的障碍，列出达成目标所需的步骤。规划的四要素：

- **当前任务**：清晰定义任务。
- **完成步骤**：把任务拆解为可管理的步骤。
- **所需资源**：识别必要资源。
- **经验**：利用过往经验指导规划。

旅行 Agent 的完整 9 步流程：

1. 收集用户偏好（日期、预算、兴趣、特殊要求）
2. 检索信息（航班、住宿、景点、餐厅）
3. 生成个性化行程建议
4. 向用户展示行程
5. 收集反馈
6. 根据反馈调整
7. 最终确认
8. 预订并发送确认信息
9. 行前/行中持续支持

## 4. 纠错式 RAG（Corrective RAG）

### 4.1 RAG vs 预加载上下文

先区分两种给模型补充知识的方式：

- **RAG（检索增强生成）**：检索系统 + 生成模型的组合。查询发生时，实时从外部源取回相关文档来增强输入，让模型生成更准确、更贴合上下文的回答。
- **预加载上下文（Pre-emptive Context Load）**：在处理查询**之前**就把相关背景信息装入模型上下文，模型从一开始就掌握这些信息，无需在处理过程中再检索。适合数据量小且相对固定的场景（如热门目的地信息字典），响应更快。

```python
class TravelAgent:
    def __init__(self):
        # 预加载热门目的地信息
        self.context = {
            "Paris": {"country": "France", "currency": "Euro", "language": "French",
                      "attractions": ["Eiffel Tower", "Louvre Museum"]},
            "Tokyo": {"country": "Japan", "currency": "Yen", "language": "Japanese",
                      "attractions": ["Tokyo Tower", "Shibuya Crossing"]},
        }

    def get_destination_info(self, destination):
        # 直接从预加载上下文取信息，不需要实时外部检索
        return self.context.get(destination)
```

### 4.2 纠错式 RAG 的三要素

纠错式 RAG 用 RAG 技术来纠正错误、提升 Agent 准确性，包含三个环节：

1. **提示技术（Prompting Technique）**：用特定提示词引导 Agent 检索相关信息。
2. **工具（Tool）**：实现算法与机制，让 Agent 能评估检索结果的相关性并生成准确回答。
3. **评估（Evaluation）**：持续评估 Agent 表现并调整，提升准确性和效率。

以旅行 Agent 为例的纠错循环：

```python
# 1. 收集初始偏好 → 2. 检索 → 3. 生成初始推荐 → 4. 收集反馈
feedback = {"liked": ["Louvre Museum"], "disliked": ["Eiffel Tower (too crowded)"]}

# 5. 纠错式 RAG 过程：
# 提示技术——根据反馈重新构造检索条件
if "disliked" in feedback:
    preferences["avoid"] = feedback["disliked"]

# 工具——用新条件重新检索并排序
new_attractions = search_attractions(preferences)
new_itinerary = create_itinerary(flights, hotels, new_attractions)

# 评估——把反馈沉淀进偏好，持续改进
def adjust_preferences(preferences, feedback):
    if "liked" in feedback:
        preferences["favorites"] = feedback["liked"]
    if "disliked" in feedback:
        preferences["avoid"] = feedback["disliked"]
    return preferences
```

### 4.3 用目标引导规划（Bootstrapping the Plan with a Goal）

先明确目标（如"最大化客户满意度"），再以该目标为准绳进行迭代。这样每次迭代都朝着期望结果收敛，过程更高效、更聚焦。典型流程：

1. 定义客户偏好和预算。
2. 基于偏好生成初始计划（bootstrap）：遍历候选目的地，满足偏好且在预算内的加入计划。
3. 迭代优化（iterate）：尝试用更匹配的选项替换计划中的每一项，同时守住预算约束。

### 4.4 用 LLM 做重排与打分（Re-ranking & Scoring）

LLM 可以对检索结果做二次评估：

- **检索（Retrieval）**：先按查询取回一批候选文档/回答。
- **重排（Re-ranking）**：LLM 按相关性和质量对候选重新排序，确保最相关、质量最高的信息排在最前。
- **打分（Scoring）**：LLM 给每个候选打分，用于挑选最佳回答。

实现方式：把用户偏好和候选目的地列表拼进 prompt，调用 Azure OpenAI，让模型返回排序和评分后的推荐结果。

### 4.5 RAG：提示技术 vs 工具

RAG 既可以作为一种**提示技术**（手动为每次查询构造检索 prompt），也可以作为一个**工具**（集成在 Agent 架构中自动完成检索+生成全流程）：

| 维度 | 提示技术 | 工具 |
|------|---------|------|
| 手动 vs 自动 | 每次查询手动构造 prompt | 检索与生成全流程自动化 |
| 控制力 | 对检索过程控制更强 | 流程化、自动化 |
| 灵活性 | 可按需定制 prompt | 更适合大规模落地 |
| 复杂度 | 需要反复打磨 prompt | 更容易集成进 Agent 架构 |

### 4.6 评估相关性（Evaluating Relevancy）

确保 Agent 检索和生成的信息对用户"对口、准确、有用"。四个关键概念：

1. **上下文感知**：理解查询上下文（如"巴黎最好的餐厅"要结合用户的菜系偏好和预算）。
2. **准确性**：信息事实正确、时效性好（推荐正在营业、评价好的餐厅，而不是过时或已关门的）。
3. **用户意图**：推断查询背后的意图（问"经济型酒店"就应优先展示平价选项）。
4. **反馈闭环**：持续收集分析用户反馈，不断校准相关性评估。

实用技巧——相关性打分 + 过滤排序：

```python
def relevance_score(item, query):
    score = 0
    if item['category'] in query['interests']:
        score += 1
    if item['price'] <= query['budget']:
        score += 1
    if item['location'] == query['destination']:
        score += 1
    return score

def filter_and_rank(items, query):
    ranked = sorted(items, key=lambda item: relevance_score(item, query), reverse=True)
    return ranked[:10]  # 只保留最相关的前 10 条
```

再配合用户反馈动态调整分值：用户"喜欢"的条目相关性 +1，"不喜欢"的 -1。

### 4.7 带意图的搜索（Search with Intent）

不止做关键词匹配，而是理解查询背后的真实目的。用户意图分三类：

- **信息型（Informational）**：想了解某个主题——"巴黎最好的博物馆有哪些？"
- **导航型（Navigational）**：想去某个特定网站/页面——"卢浮宫官网"
- **交易型（Transactional）**：想完成一笔交易——"订一张去巴黎的机票"

实现思路：先识别意图 → 结合历史交互分析上下文 → 按意图路由到不同的搜索逻辑 → 基于用户历史做个性化过滤。

```python
def identify_intent(query):
    if "book" in query or "purchase" in query:
        return "transactional"
    elif "website" in query or "official" in query:
        return "navigational"
    else:
        return "informational"

def search_with_intent(query, preferences, user_history):
    intent = identify_intent(query)
    if intent == "informational":
        results = search_information(query, preferences)
    elif intent == "navigational":
        results = search_navigation(query)
    elif intent == "transactional":
        results = search_transaction(query, preferences)
    return personalize_results(results, user_history)  # 个性化过滤
```

## 5. 把"生成代码"作为工具

代码生成 Agent 用生成式 AI 模型编写并执行代码，以解决复杂问题、自动化任务。典型应用：

1. **自动代码生成**：为数据分析、网页抓取、机器学习等任务生成代码片段。
2. **SQL 即 RAG**：用 SQL 查询从数据库检索和处理数据。
3. **问题求解**：生成并执行代码来解决具体问题（算法优化、数据分析）。

### 5.1 代码生成型旅行 Agent 的工作流

1. **收集用户偏好**：目的地、日期、预算、兴趣。
2. **生成取数代码**：生成检索航班、酒店、景点数据的代码片段。
3. **执行生成的代码**：运行代码获取实时信息。
4. **生成行程**：把取回的数据汇编成个性化旅行计划。
5. **按反馈调整**：接收用户反馈，必要时**重新生成代码**再执行，精化结果。

```python
def generate_code_to_fetch_data(preferences):
    # 生成按用户偏好查询航班的代码（示意）
    code = f"""
    def search_flights():
        import requests
        response = requests.get('https://api.example.com/flights', params={preferences})
        return response.json()
    """
    return code

def execute_code(code):
    exec(code)          # 注意：生产环境需要沙箱隔离执行
    return locals()
```

### 5.2 利用环境感知与推理

结合数据表 schema 可以增强查询生成的质量：

1. **理解 schema**：系统理解表结构，用它来"锚定"（ground）查询生成。
2. **按反馈推理调整**：根据用户反馈，推理 schema 中哪些字段需要更新。
3. **生成并执行查询**：按新偏好生成并执行查询，获取更新后的数据。

让系统具备环境感知并基于 schema 推理，可以生成更准确、更相关的查询，带来更好的推荐和更个性化的体验。

### 5.3 SQL 作为 RAG 技术

SQL 是与数据库交互的有力工具，作为 RAG 手段使用时，Agent 根据上下文和用户需求**动态生成 SQL 查询**，用检索到的数据支撑推荐生成：

```python
def generate_sql_query(table, preferences):
    query = f"SELECT * FROM {table} WHERE "
    conditions = [f"{key}='{value}'" for key, value in preferences.items()]
    query += " AND ".join(conditions)
    return query

# 生成的查询示例：
# SELECT * FROM flights WHERE destination='Paris' AND budget='moderate';
# SELECT * FROM hotels WHERE destination='Paris' AND budget='moderate';
```

对航班、酒店、景点分别生成查询、执行、汇编成行程——整个取数逻辑由 Agent 按需动态构造。

## 6. 元认知完整示例：会反思的酒店推荐 Agent

一个演示元认知落地的最小示例：Agent 先按某种策略选酒店，然后**评估自己的推理过程**，发现错误或次优选择时调整策略。

三步演示元认知：

1. **初始决策**：Agent 用"最便宜"策略选酒店，未考虑质量影响。
2. **反思与评估**：通过用户反馈检查该选择是否糟糕；如果酒店质量太低，反思自己的推理。
3. **调整策略**：基于反思把策略从 "cheapest" 切换到 "highest_quality"，改进后续决策。

```python
class HotelRecommendationAgent:
    def __init__(self):
        self.previous_choices = []       # 历史选择
        self.corrected_choices = []      # 纠正后的选择
        self.recommendation_strategies = ['cheapest', 'highest_quality']

    def recommend_hotel(self, hotels, strategy):
        if strategy == 'cheapest':
            recommended = min(hotels, key=lambda x: x['price'])
        elif strategy == 'highest_quality':
            recommended = max(hotels, key=lambda x: x['quality'])
        self.previous_choices.append((strategy, recommended))
        return recommended

    def reflect_on_choice(self):
        """反思上一次选择，决定是否调整策略"""
        last_strategy, last_choice = self.previous_choices[-1]
        user_feedback = self.get_user_feedback(last_choice)
        if user_feedback == "bad":
            # 上次选择不理想 → 切换策略
            new_strategy = 'highest_quality' if last_strategy == 'cheapest' else 'cheapest'
            self.corrected_choices.append((new_strategy, last_choice))
            return f"Reflecting on choice. Adjusting strategy to {new_strategy}."
        return "The choice was good. No need to adjust."

    def get_user_feedback(self, hotel):
        # 模拟反馈：太便宜或质量低于 7 分则为差评
        if hotel['price'] < 100 or hotel['quality'] < 7:
            return "bad"
        return "good"
```

关键点在于 Agent 具备两种能力：

- 评估自己过往的选择和决策过程；
- 基于这种反思调整策略——这就是元认知在起作用。

这是元认知的最简形式：系统能够根据**内部反馈**调整自己的推理过程。

## 7. 小结

元认知能显著增强 AI Agent 的能力。通过引入元认知过程（自我反思、纠错式 RAG、意图理解、策略调整），可以设计出更智能、更有适应性、更高效的 Agent。核心思想：**不只修正输出，还要修正产生输出的推理策略本身**。

## 8. 延伸资料

- [Microsoft Foundry Discord 社区](https://discord.com/invite/ATgtXmAS5D)：与其他学习者交流、参加答疑

---

- 上一课：[08-多 Agent 设计模式](08-multi-agent-zh-optimized.md)
- 下一课：[10-AI Agent 生产化](10-ai-agents-production-zh-optimized.md)
