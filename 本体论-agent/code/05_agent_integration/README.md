# 05 Agent 集成示例

这一组示例只使用 Python 标准库，演示如何把本体概念接入 Agent 的上下文、检索、工具和策略层。

## 文件说明

- `ontology_context.py`：按实体类型和关系筛选上下文。
- `hybrid_retrieval.py`：合并图事实、关键词结果和向量结果。
- `tool_guard.py`：校验工具输入、前置条件和风险状态。

运行示例：

```bash
python3 本体论-agent/code/05_agent_integration/ontology_context.py
python3 本体论-agent/code/05_agent_integration/hybrid_retrieval.py
python3 本体论-agent/code/05_agent_integration/tool_guard.py
```

这些代码是教学骨架，不包含真实的模型调用、数据库连接或生产级鉴权。生产系统仍需要服务端策略执行、持久化和审计。

