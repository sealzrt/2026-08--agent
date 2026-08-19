# Agentic RAG：自主规划的检索增强生成

来源：Microsoft Learn 开源课程 [AI Agents for Beginners - Agentic RAG](https://github.com/microsoft/ai-agents-for-beginners/blob/main/05-agentic-rag/README.md)

> 本文是对原英文课程的中文整理版，不是逐字翻译。目标是帮助中文读者理解 Agentic RAG 与传统 RAG 的本质区别、迭代式工作循环，以及适用边界与治理要求。

## 1. 这节课要解决什么问题

- 理解 Agentic RAG：LLM 在从外部数据源检索信息的同时，还能**自主规划下一步行动**的新范式。
- 掌握迭代式"制作者-检查者"（Maker-Checker）循环：LLM 调用与工具调用交替进行，用结构化输出提升正确率、处理不合规查询。
- 识别 Agentic RAG 的高价值场景：正确性优先的环境、复杂数据库交互、长时间运行的工作流。

## 2. 什么是 Agentic RAG

传统 RAG 是静态的"先检索、再阅读"（retrieval-then-read）模式，或者依赖精心编排的提示词链。Agentic RAG 则是一个循环：

> LLM 调用 → 工具调用 → LLM 调用 → ……直到得到满意的答案

每一轮中，系统会评估已获得的结果，决定是否改写查询、是否需要调用额外的工具，如此循环直到达成满意的解。这种迭代式的"制作者-检查者"风格可以提升正确率、处理结构化数据库的畸形查询（例如 NL2SQL 场景），并保证结果的均衡和高质量。

关键在于：系统**主动掌控自己的推理过程**。它可以改写失败的查询、切换检索方法、在给出最终答案前整合多种工具——例如 Azure AI Search 的向量检索、SQL 数据库、自定义 API。这也意味着不再需要过度复杂的编排框架，一个相对简单的循环就能产出复杂且有据可依的结果。

## 3. "掌控推理过程"是 Agentic 的分水岭

传统 RAG 通常由人预先定义模型的路径：一条写明"何时检索什么"的思维链。而真正 Agentic 的系统会**自己决定如何处理问题**——它不是在执行脚本，而是根据所获信息的质量自主决定步骤顺序。

举例：要求它制定一个产品发布策略时，它不依赖一个把整套调研和决策流程写死的提示词，而是自主决定：

1. 用 Bing Web Grounding 检索最新市场趋势报告。
2. 用 Azure AI Search 找出相关竞品数据。
3. 用 Azure SQL Database 关联内部历史销售指标。
4. 通过 Azure OpenAI Service 把发现综合成一份完整策略。
5. 评估策略是否有缺口或矛盾，必要时再发起新一轮检索。

改写查询、选择数据源、迭代到"满意"为止——这些都由模型决定，而不是人预先编排。

## 4. 迭代循环、工具集成与记忆

Agentic 系统依赖一个循环式交互模式：

- **初始调用**：把用户目标（用户提示词）交给 LLM。
- **工具调用**：模型发现信息缺失或指令含糊时，选择一种工具或检索方法补充上下文——例如向量数据库查询（如 Azure AI Search 对私有数据的混合检索）或结构化 SQL 查询。
- **评估与改进**：审视返回的数据后，模型判断信息是否足够；不够就改写查询、换工具或调整思路。
- **循环直到满意**：持续循环，直到模型认为已有足够清晰的证据来给出最终的、有充分推理的回答。
- **记忆与状态**：系统跨步骤维护状态和记忆，能回忆之前的尝试及其结果，避免重复循环，并做出更明智的决策。

随着循环推进，系统对问题的理解逐步深化，从而能够在无需人持续干预、反复修改提示词的情况下完成复杂的多步任务。

## 5. 失败处理与自我纠正

Agentic RAG 的自主性也包含健壮的自我纠正机制。遇到死胡同（检索到无关文档、查询畸形等）时，它可以：

- **迭代重查**：不返回低价值的回答，而是尝试新的搜索策略、重写数据库查询、查看其他数据集。
- **使用诊断工具**：调用辅助函数来调试推理步骤、确认检索数据的正确性。Azure AI Tracing 这类工具对可观测性和监控非常重要。
- **回退到人工监督**：对高风险或反复失败的场景，模型可以标记不确定性并请求人工指导；人给出纠正反馈后，模型在后续过程中吸收这一经验。

这种动态迭代让模型在单次会话内持续改进，而不是"一锤子买卖"。

## 6. 自主性的边界

尽管在任务内具有自主性，Agentic RAG **不等于通用人工智能（AGI）**。它的"agentic"能力被限定在开发者提供的工具、数据源和策略之内，不能自己发明工具，也不能越出设定的领域边界。它擅长的是动态编排手头已有的资源。

与更高级 AI 形态的关键差异：

1. **领域内自主**：聚焦在已知领域内达成用户定义的目标，通过查询改写、工具选择等策略优化结果。
2. **依赖基础设施**：能力取决于开发者集成了哪些工具和数据，无法在没有人工干预的情况下突破这些边界。
3. **遵守护栏**：伦理准则、合规规则、业务策略始终有效，Agent 的自由度永远受安全措施和监督机制约束。

## 7. 高价值应用场景

Agentic RAG 在需要迭代打磨和高精度的场景中表现突出：

1. **正确性优先的环境**：合规检查、监管分析、法律研究——模型可以反复核实事实、查阅多个来源、改写查询，直到产出经过充分验证的答案。
2. **复杂数据库交互**：结构化数据查询经常失败或需要调整时，系统可以基于 Azure SQL 或 Microsoft Fabric OneLake 自主优化查询，确保最终检索结果符合用户意图。
3. **长时间运行的工作流**：会话随新信息不断演化，Agentic RAG 能持续吸收新数据，随着对问题空间的理解加深而调整策略。

## 8. 治理、透明与信任

系统的推理越自主，治理和透明就越关键：

- **可解释的推理**：模型应能提供审计轨迹——发起过哪些查询、参考了哪些来源、经过哪些推理步骤。Azure AI Content Safety、Azure AI Tracing / GenAIOps 等工具有助于保持透明、降低风险。
- **偏见控制与均衡检索**：开发者可以调整检索策略以确保数据来源均衡、有代表性，并定期审计输出以发现偏见或倾斜（高级数据科学团队可用 Azure Machine Learning 自定义模型）。
- **人工监督与合规**：敏感任务仍需人工审查。Agentic RAG 不是替代人在高风险决策中的判断，而是通过提供经过更充分验证的选项来增强人的判断。

没有清晰的行为记录工具，调试一个多步骤流程会非常困难——务必配备可观测性工具。

## 9. 小结

Agentic RAG 是 AI 系统处理复杂、数据密集型任务的自然演进：通过循环式交互、自主选择工具、迭代优化查询，系统从"静态地跟随提示词"进化为"自适应、有上下文感知的决策者"。虽然仍受人类定义的基础设施和伦理准则约束，但这些能力让 AI 交互对企业和最终用户都更丰富、更动态、更有用。

## 10. 延伸资料

- [用 Azure OpenAI Service 实现 RAG（Microsoft Learn 模块）](https://learn.microsoft.com/training/modules/use-own-data-azure-openai)
- [Microsoft Foundry 上生成式 AI 应用的评估方法](https://learn.microsoft.com/azure/ai-studio/concepts/evaluation-approach-gen-ai)
- [What is Agentic RAG | Weaviate](https://weaviate.io/blog/what-is-agentic-rag)
- [Agentic RAG: turbocharge your RAG（Hugging Face Cookbook）](https://huggingface.co/learn/cookbook/agent_rag)

学术论文：

- [Self-Refine: Iterative Refinement with Self-Feedback (2303.17651)](https://arxiv.org/abs/2303.17651)
- [Reflexion: Language Agents with Verbal Reinforcement Learning (2303.11366)](https://arxiv.org/abs/2303.11366)
- [CRITIC: LLMs Can Self-Correct with Tool-Interactive Critiquing (2305.11738)](https://arxiv.org/abs/2305.11738)
- [Agentic RAG: A Survey (2501.09136)](https://arxiv.org/abs/2501.09136)

---

- 上一课：[04-工具使用设计模式](04-tool-use-zh-optimized.md)
- 下一课：[06-构建可信的 AI Agent](06-trustworthy-agents-zh-optimized.md)
