# -*- coding: utf-8 -*-
"""04. State：让工作流拥有共享上下文

多节点图，共享同一个 State：
- 节点只返回自己修改的字段（局部更新），LangGraph 负责合并回状态
- 默认覆盖：返回同名字段会覆盖旧值
- reducer 用于控制合并策略（如 list 追加）

运行方式：
    python step_by_step/04_state_graph.py

练习任务：
- 给状态增加 final_report: str 字段，并初始化为空字符串。
- 增加 source_count: int 字段，记录资料数量。
"""

from typing import TypedDict

from langgraph.graph import END, START, StateGraph


class ResearchState(TypedDict):
    topic: str
    questions: list[str]
    documents: list[str]
    summary: str
    quality_score: int


def analyze_topic(state: ResearchState) -> dict[str, list[str]]:
    return {
        "questions": [
            f"{state['topic']} 是什么？",
            f"{state['topic']} 适合解决什么问题？",
        ]
    }


def search_documents(state: ResearchState) -> dict[str, list[str]]:
    documents = [f"资料：{question}" for question in state["questions"]]
    return {"documents": documents}


def summarize_documents(state: ResearchState) -> dict[str, str]:
    return {
        "summary": f"基于 {len(state['documents'])} 份资料，总结主题：{state['topic']}"
    }


builder = StateGraph(ResearchState)
builder.add_node("analyze_topic", analyze_topic)
builder.add_node("search_documents", search_documents)
builder.add_node("summarize_documents", summarize_documents)

builder.add_edge(START, "analyze_topic")
builder.add_edge("analyze_topic", "search_documents")
builder.add_edge("search_documents", "summarize_documents")
builder.add_edge("summarize_documents", END)

graph = builder.compile()


if __name__ == "__main__":
    result = graph.invoke({
        "topic": "LangGraph",
        "questions": [],
        "documents": [],
        "summary": "",
        "quality_score": 0,
    })
    print(result)
