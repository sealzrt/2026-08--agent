# 第 6 章：记忆系统与 RAG

> 📖 路径标注：🟢 深入路径必读  
> ⏱ 预计阅读：30 分钟 | 动手实践：20 分钟

---

## 6.0 本章导读

### 这一章解决什么问题？

你和旅行助手聊天："我喜欢靠窗的座位。" 它记住了。  
10 分钟后你问："帮我订一张机票。" 它问："您喜欢靠窗还是靠过道？"

它**失忆**了。

没有记忆的智能体，每次对话都从零开始。你不得不反复告诉它同样的信息。这不是"智能"助手，这是"健忘"助手。

### 前置知识

- ✅ 第 3 章 —— 你需要知道什么是 Token、上下文窗口
- ✅ 第 5 章 —— 你需要知道 Agent 范式

### 学完本章你将能做什么？

- [ ] 能区分短期记忆、长期记忆和工作记忆
- [ ] 能解释向量数据库和语义检索的原理
- [ ] 能用 LangChain + ChromaDB 为智能体添加记忆
- [ ] 能理解 RAG 的完整流程并实现最小版本

---

## 6.1 为什么智能体需要记忆？

### LLM 的"工作台"有限

LLM 有一个**上下文窗口**——它一次能"看到"的文本量是有限的（如 4K、8K、128K tokens）。

> 💡 **类比**：上下文窗口就像你的**工作台桌面**。桌面大小有限，你不可能把所有文件都摊开放在上面。你需要一个"文件柜"来存放暂时不用的文件——这就是记忆系统。

### 三种需要记忆的场景

| 场景 | 例子 | 需要的记忆类型 |
|------|------|--------------|
| 对话内记忆 | "那回程呢？"→ 记得出发地 | 短期记忆 |
| 跨会话记忆 | "我上次说的靠窗偏好" | 长期记忆 |
| 知识检索 | "我们公司的报销政策是什么？" | RAG（外部知识库） |

---

## 6.2 记忆的类型与架构

### 三种记忆，类比人类认知

| 记忆类型 | 人类类比 | 智能体实现 | 容量 | 持久性 |
|---------|---------|-----------|------|--------|
| **短期记忆** | 正在想的事 | 对话历史（messages 列表） | 受窗口限制 | 会话内 |
| **长期记忆** | 过去经历的事 | 向量数据库 | 理论上无限 | 跨会话 |
| **工作记忆** | 当前任务的摘要 | 对话摘要 + 关键信息提取 | 较小 | 会话内 |

### 短期记忆的实现

最简单的方式：把对话历史全部塞进 prompt。

```python
# 短期记忆：把全部对话历史拼进 prompt，让 LLM 能看到之前说过什么
messages = [
    {"role": "system", "content": "你是旅行助手"},
    {"role": "user", "content": "我喜欢靠窗座位"},      # 第1轮：用户表达偏好
    {"role": "assistant", "content": "好的，已记住"},  # 第1轮：AI 确认
    {"role": "user", "content": "帮我订机票"},          # 第N轮：新请求
]
```

问题：对话越长，Token 越多，超出窗口限制。

**解决：对话摘要**。定期把旧对话压缩成摘要：

```python
# 对话摘要：把旧对话压缩成简短摘要，节省 Token
summary = llm_call("请将以下对话压缩为关键信息摘要：" + old_messages)
# 将摘要放入 system 消息，代替完整历史
messages = [{"role": "system", "content": f"用户偏好摘要：{summary}"}]
```

---

## 6.3 向量数据库与语义检索

### 为什么需要"语义"检索？

传统搜索是**关键词匹配**：搜"机票"只能找到包含"机票"的文档。

但如果你问"怎么去上海？"，相关文档可能是"航班信息""高铁时刻表"——这些文档里没有"机票"这个关键词。

**语义检索**解决的就是这个问题：按"意思"而非"文字"来搜索。

> 💡 **类比**：传统搜索是图书馆按书名查找；语义检索是按"主题"查找——你搜"出行方式"，它能找到所有和交通相关的书，不管书中有没有"出行"这个词。

### 工作原理

```
文本 "我喜欢靠窗座位"
   ↓ Embedding 模型
向量 [0.12, -0.34, 0.56, ..., 0.78]  （768 维或更高）

文本 "我想坐窗边"
   ↓ Embedding 模型
向量 [0.11, -0.33, 0.55, ..., 0.77]  （和上面很接近！）

→ 计算余弦相似度：0.97（非常相似）
```

### 主流向量数据库对比

| 向量库 | 特点 | 适用场景 |
|--------|------|---------|
| ChromaDB | 轻量、本地运行 | 开发和学习 |
| FAISS | Meta 开源、速度快 | 大规模检索 |
| Pinecone | 云服务、免运维 | 生产环境 |

---

## 6.4 RAG：检索增强生成

### 什么是 RAG？

**RAG = Retrieval-Augmented Generation**（检索增强生成）

> 💡 **类比**：RAG 就像**开卷考试**——你不是凭空回答，而是先翻书找到相关内容，再基于书中内容写答案。

### 完整流程

```
用户问："我们公司的差旅报销标准是什么？"
   ↓
[检索] 从向量数据库中搜索相关文档
   → 找到：《差旅制度 v3.0》第 4 章
   ↓
[拼接] 把检索到的文档 + 用户问题 一起发给 LLM
   Prompt = "参考以下资料：\n{检索内容}\n\n请回答：{用户问题}"
   ↓
[生成] LLM 基于参考资料生成答案
   → "根据公司差旅制度，国内出差每日住宿标准为..."
```

### 文档分块策略

大文档不能整篇存入向量库（太长，检索精度低）。需要先分块：

| 策略 | 方法 | 适用场景 |
|------|------|---------|
| 固定长度 | 每 500 字切一块 | 通用 |
| 按段落 | 按 `\n\n` 切分 | 结构化文档 |
| 语义分块 | 按主题边界切分 | 长文本 |

---

## 6.5 动手实践：为旅行助手添加记忆

### 基于 LangChain + ChromaDB

```bash
# 先安装依赖（如果还没装的话）
pip install langchain langchain-chroma langchain-community langchain-openai sentence-transformers
```

```python
# --- 导入依赖 ---
from langchain.memory import ConversationBufferWindowMemory  # 滑动窗口记忆
from langchain_chroma import Chroma                          # 向量数据库
from langchain_community.embeddings import HuggingFaceEmbeddings  # 本地 Embedding
from langchain_openai import ChatOpenAI                      # LLM（通过 OpenAI 兼容接口）
from langchain.chains import ConversationalRetrievalChain    # 对话+检索链
import os

# --- 创建 Embedding 模型（本地运行，无需 API Key）---
embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-small-zh-v1.5")  # 中文语义模型

# --- 创建向量记忆库 ---
vectorstore = Chroma(
    embedding_function=embeddings,           # 用 Embedding 模型将文本转为向量
    persist_directory="./travel_memory"      # 向量数据持久化目录
)

# --- 存入用户偏好（长期记忆）---
vectorstore.add_texts(
    texts=["用户喜欢靠窗座位", "用户偏好经济舱", "用户不吃辣"],
    metadatas=[{"type": "preference"}] * 3   # 为每条记忆添加元数据标签
)

# --- 创建对话链：LLM + 向量检索 + 短期记忆 ---
memory = ConversationBufferWindowMemory(
    k=5,                     # 滑动窗口大小：只保留最近 5 轮对话
    memory_key="chat_history"
)
chain = ConversationalRetrievalChain.from_llm(
    llm=ChatOpenAI(
        model="deepseek-chat",                       # DeepSeek 对话模型
        base_url="https://api.deepseek.com",         # DeepSeek API 地址
        api_key=os.getenv("DEEPSEEK_API_KEY"),
    ),
    retriever=vectorstore.as_retriever(
        search_kwargs={"k": 3}   # 每次检索返回最相似的 3 条记录
    ),
    memory=memory,
)

# --- 测试：对话链会自动检索相关记忆并生成回复 ---
print(chain.invoke({"question": "帮我订机票"}))
# → 会提到"根据偏好，为您推荐靠窗座位"
```

### 旅行助手 v0.4 达成！

现在它能：
- ✅ 记住对话历史（短期记忆）
- ✅ 跨会话记住用户偏好（长期记忆）
- ✅ 从知识库检索相关信息（RAG）

---

## 动手实践

### 🎯 为旅行助手添加偏好记忆

1. 用 5 条不同的用户偏好填充向量库
2. 测试"帮我订机票"——看它是否主动提及偏好
3. 测试"推荐餐厅"——看它是否考虑口味偏好

### 🚧 常见坑

**坑 #1：Embedding 模型不一致**
- 现象：检索结果很差，找不到相关内容
- 原因：存入时用的模型 A，检索时用了模型 B
- 解决：存入和检索必须用**同一个** Embedding 模型

### 🏋️ 进阶挑战

实现一个"记忆衰减"机制：最近 3 天的偏好权重高，更早的偏好权重低。

---

## 本章小结

### 📦 本章成果

旅行助手升级为 **v0.4**——它有了记忆。能记住对话历史、跨会话保存偏好、从知识库检索信息。

### 🗂 知识卡片

| 概念 | 一句话解释 | 类比 |
|------|-----------|------|
| 短期记忆 | 当前对话的上下文 | 工作台上的文件 |
| 长期记忆 | 跨会话持久化存储 | 文件柜 |
| Embedding | 把文本变成向量（数字列表） | 给每本书生成"主题指纹" |
| 向量数据库 | 按语义相似度检索的数据库 | 图书馆按主题索引 |
| RAG | 先检索相关文档再让 LLM 回答 | 开卷考试 |

### ⚠️ 还缺什么？

有了记忆，智能体能"存"信息了。但每次调用 LLM 时，该往上下文里"塞"什么？记忆库里存了 1000 条信息，全塞进去会超出窗口，只塞几条又可能遗漏关键信息。**如何智能地组装上下文**，是下一章要解决的问题。

### ➡️ 下一章预告

第 7 章：**上下文工程** —— 管理智能体的"工作台"，学会在有限的窗口里放入最有价值的信息。

---

## 习题

1. **[概念理解]** 短期记忆和长期记忆的区别是什么？在什么场景下应该把短期记忆"升级"为长期记忆？
2. **[概念理解]** 为什么 RAG 比纯 LLM 回答更可靠？它解决了 LLM 的哪个局限？
3. **[动手实践]** 用 ChromaDB 存储 10 条旅行相关文档，测试不同 query 的检索结果。
4. **[动手实践]** 对比"有记忆"和"无记忆"的旅行助手在 5 轮对话中的表现差异。
5. **[开放思考]** 如果记忆库中存了错误信息（如"用户喜欢吃辣"但实际不喜欢），该如何纠正？

---

## 参考文献

- Lewis, P. et al. (2020). "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"
- Gao, Y. et al. (2024). "Retrieval-Augmented Generation for Large Language Models: A Survey"
- LangChain Memory Documentation: https://python.langchain.com/docs/modules/memory/
