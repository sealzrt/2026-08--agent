# -*- coding: utf-8 -*-
"""12. 流式输出与前端集成

- graph.stream(stream_mode="updates")：输出每个节点返回的局部状态更新
- 统一整理为前端可消费的事件结构：
  {task_id, node, status, event_type, payload}

后端内部调试优先使用 stream(stream_mode="updates")；
前端事件流优先设计为对接 stream_events(version="v3")。

运行方式：
    python step_by_step/12_stream_output.py
"""

from typing import TypedDict

from langgraph.graph import END, START, StateGraph


class ResearchState(TypedDict):
    topic: str
    documents: list[str]
    summary: str


def analyze_topic(state: ResearchState) -> dict[str, list[str]]:
    return {"documents": [f"资料：《{state['topic']}》的入门资料"]}


def summarize_documents(state: ResearchState) -> dict[str, str]:
    return {"summary": f"基于 {len(state['documents'])} 份资料总结：{state['topic']}"}


builder = StateGraph(ResearchState)
builder.add_node("analyze_topic", analyze_topic)
builder.add_node("summarize_documents", summarize_documents)
builder.add_edge(START, "analyze_topic")
builder.add_edge("analyze_topic", "summarize_documents")
builder.add_edge("summarize_documents", END)

graph = builder.compile()


def to_frontend_event(task_id: str, chunk: dict, status: str = "running") -> dict:
    """把 stream 输出整理成前端可消费的统一事件格式。"""
    node = list(chunk.keys())[0] if chunk else ""
    return {
        "task_id": task_id,
        "node": node,
        "status": status,
        "event_type": "node_update",
        "payload": chunk.get(node, {}) if chunk else {},
    }


if __name__ == "__main__":
    config = {"configurable": {"thread_id": "stream-001"}}

    for chunk in graph.stream(
        {
            "topic": "LangGraph 流式输出",
            "documents": [],
            "summary": "",
        },
        config,
        stream_mode="updates",
    ):
        print(to_frontend_event("stream-001", chunk))
