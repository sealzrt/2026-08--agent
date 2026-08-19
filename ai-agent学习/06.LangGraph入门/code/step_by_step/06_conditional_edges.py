# -*- coding: utf-8 -*-
"""06. Edge：控制流程、分支和结束条件

- 普通边：固定下一步
- 条件边 add_conditional_edges：根据状态决定下一步
- 路由函数只负责返回路由标签，不做重业务逻辑

运行方式：
    python step_by_step/06_conditional_edges.py

练习任务：
- 修改 need_search 判断规则，让主题包含"最新"时必须检索。
- 增加一个 reject 路由，让空主题直接结束并返回错误提示。
"""

from typing import Literal, TypedDict

from langgraph.graph import END, START, StateGraph


class ResearchState(TypedDict):
    topic: str
    need_search: bool
    documents: list[str]
    summary: str


def analyze_topic(state: ResearchState) -> dict[str, bool]:
    return {"need_search": len(state["topic"]) > 8}


def route_after_analysis(state: ResearchState) -> Literal["search", "summarize"]:
    if state["need_search"]:
        return "search"
    return "summarize"


def search_documents(state: ResearchState) -> dict[str, list[str]]:
    return {"documents": [f"模拟资料：{state['topic']}"]}


def summarize_documents(state: ResearchState) -> dict[str, str]:
    source_count = len(state["documents"])
    return {"summary": f"基于 {source_count} 份资料总结：{state['topic']}"}


builder = StateGraph(ResearchState)
builder.add_node("analyze_topic", analyze_topic)
builder.add_node("search_documents", search_documents)
builder.add_node("summarize_documents", summarize_documents)

builder.add_edge(START, "analyze_topic")
builder.add_conditional_edges(
    "analyze_topic",
    route_after_analysis,
    {
        "search": "search_documents",
        "summarize": "summarize_documents",
    },
)
builder.add_edge("search_documents", "summarize_documents")
builder.add_edge("summarize_documents", END)

graph = builder.compile()


if __name__ == "__main__":
    result = graph.invoke({
        "topic": "LangGraph 条件边",
        "need_search": False,
        "documents": [],
        "summary": "",
    })
    print(result["summary"])
