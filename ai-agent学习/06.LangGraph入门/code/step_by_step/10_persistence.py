# -*- coding: utf-8 -*-
"""10. 持久化与会话恢复

- checkpointer：保存线程级短期执行状态（按 thread_id 区分会话）
- thread_id：区分不同会话；同一个 thread_id 复用同一条会话状态
- InMemorySaver：内存型 checkpointer，仅用于教程演示，不能用于生产

关键行为（已实测）：
- 同一个 thread_id 第二次调用时，未提供的字段会从 checkpoint 恢复
- 新 thread_id 没有历史状态，缺失字段会报 KeyError（不会自动补默认值）

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


def main() -> None:
    # 1. 第一次调用：初始化 thread research-001
    config = {"configurable": {"thread_id": "research-001"}}
    first = graph.invoke({"topic": "LangGraph 持久化", "notes": []}, config)
    print("第 1 次：", first)

    # 2. 第二次调用：同一个 thread，不传 notes —— 从 checkpoint 恢复
    second = graph.invoke({"topic": "LangGraph 持久化"}, config)
    print("第 2 次：", second)

    # 3. 新 thread：没有历史状态，缺 notes 会 KeyError
    try:
        graph.invoke(
            {"topic": "LangGraph 持久化"},
            {"configurable": {"thread_id": "other-002"}},
        )
    except KeyError as exc:
        print(f"新 thread 缺字段：KeyError: {exc}")


if __name__ == "__main__":
    main()
