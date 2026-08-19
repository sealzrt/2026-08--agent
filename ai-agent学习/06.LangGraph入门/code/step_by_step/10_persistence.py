# -*- coding: utf-8 -*-
"""10. 持久化与会话恢复

- checkpointer：保存线程级短期执行状态（按 thread_id 区分会话）
- store：保存跨线程长期记忆（本示例不涉及）
- InMemorySaver：内存型 checkpointer，仅用于教程演示，不能用于生产

运行方式：
    python step_by_step/10_persistence.py

练习任务：
- 用两个不同的 thread_id 运行，观察状态隔离。
- 思考如果改成数据库持久化，需要保存哪些字段、如何清理历史状态。
"""

from typing import TypedDict

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph


class ResearchState(TypedDict):
    topic: str
    notes: list[str]


def add_note(state: ResearchState) -> dict[str, list[str]]:
    return {
        "notes": state["notes"] + [f"记录主题：{state['topic']}"]
    }


builder = StateGraph(ResearchState)
builder.add_node("add_note", add_note)
builder.add_edge(START, "add_note")
builder.add_edge("add_note", END)

checkpointer = InMemorySaver()
graph = builder.compile(checkpointer=checkpointer)


if __name__ == "__main__":
    config = {"configurable": {"thread_id": "research-001"}}

    first = graph.invoke(
        {"topic": "LangGraph 持久化", "notes": []},
        config,
    )
    print(first)

    second = graph.invoke(
        {"topic": "LangGraph 持久化", "notes": first["notes"]},
        config,
    )
    print(second)
