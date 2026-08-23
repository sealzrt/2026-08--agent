# 06 LangGraph 工程化示例

这里提供一个不依赖第三方库的项目骨架，用来演示第四阶段的工程概念：任务 ID、线程 ID、事件、审核恢复和证据链。

## 文件说明

- `ids_and_events.py`：创建任务、运行记录和事件记录。
- `hitl_flow.py`：用标准库模拟 `interrupt -> Interrupt 返回结构 -> resume` 的流程。
- `evidence_chain.py`：构造回答、结论和证据链。

运行示例：

```bash
python3 本体论-agent/code/06_langgraph_project/ids_and_events.py
python3 本体论-agent/code/06_langgraph_project/hitl_flow.py
python3 本体论-agent/code/06_langgraph_project/evidence_chain.py
```

这些脚本不是 LangGraph 的替代实现，只是帮助读者在安装依赖前先理解业务数据结构。真正项目应使用 LangGraph 的 checkpointer、`interrupt()` 和 `Command(resume=...)`。

