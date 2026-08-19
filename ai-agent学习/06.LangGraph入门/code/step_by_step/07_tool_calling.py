# -*- coding: utf-8 -*-
"""07. 工具调用：让 Agent 连接外部能力

- 工具函数：负责访问外部能力，不依赖 LangGraph，不修改状态
- 节点函数：把状态转换成工具输入，再把工具输出写回状态
- 工具异常需要在节点中捕获，避免整个图直接失败

运行方式：
    python step_by_step/07_tool_calling.py

练习任务：
- 给 mock_search_tool() 增加 source 字段。
- 把模拟检索替换为本地 Markdown 文件检索。
"""

from typing import TypedDict

from langgraph.graph import END, START, StateGraph


class SearchResult(TypedDict):
    title: str
    content: str


class ResearchState(TypedDict):
    topic: str
    search_queries: list[str]
    documents: list[SearchResult]
    errors: list[str]


def mock_search_tool(query: str) -> list[SearchResult]:
    if not query.strip():
        raise ValueError("query 不能为空")

    return [
        {
            "title": f"{query} 入门资料",
            "content": f"这是一段关于 {query} 的模拟资料。",
        }
    ]


def search_documents(state: ResearchState) -> dict[str, object]:
    documents: list[SearchResult] = []
    errors: list[str] = []

    for query in state["search_queries"]:
        try:
            documents.extend(mock_search_tool(query))
        except Exception as exc:
            errors.append(f"检索失败：{query}，原因：{exc}")

    return {
        "documents": documents,
        "errors": errors,
    }


builder = StateGraph(ResearchState)
builder.add_node("search_documents", search_documents)
builder.add_edge(START, "search_documents")
builder.add_edge("search_documents", END)

graph = builder.compile()


if __name__ == "__main__":
    result = graph.invoke({
        "topic": "LangGraph",
        "search_queries": ["LangGraph 是什么", "LangGraph 如何使用"],
        "documents": [],
        "errors": [],
    })
    print(result["documents"])
    print("errors:", result["errors"])
