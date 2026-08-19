# -*- coding: utf-8 -*-
"""节点：制定检索计划、执行检索并写回状态。

- plan_search：把研究问题转换成检索词
- search_documents：调用工具，捕获单个查询失败，不让整个图崩溃
"""

from app.state import ResearchState, SearchResult
from app.tools.search_tool import search_tool


def plan_search(state: ResearchState) -> dict:
    return {"search_queries": [f"{state['topic']} {q}" for q in state["questions"]]}


def search_documents(state: ResearchState) -> dict:
    documents: list[SearchResult] = []
    errors: list[str] = []

    queries = state["search_queries"] or [state["topic"]]
    for query in queries:
        try:
            documents.extend(search_tool(query))
        except Exception as exc:
            errors.append(f"检索失败：{query}，原因：{exc}")

    return {
        "documents": state["documents"] + documents,
        "errors": state["errors"] + errors,
        "iteration_count": state["iteration_count"] + 1,
    }
