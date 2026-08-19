# -*- coding: utf-8 -*-
"""检索工具：只负责检索，不依赖 LangGraph，不修改状态。

统一检索入口是 search_tool()。
后续替换为真实检索（数据库查询 / HTTP API / 本地文件）时，
只需修改 search_tool() 内部实现，节点代码不用变。
"""

from app.state import SearchResult


def mock_search_tool(query: str) -> list[SearchResult]:
    """模拟检索：返回固定结构资料，保证教程可复现。"""
    if not query.strip():
        raise ValueError("query 不能为空")

    return [
        {
            "title": f"{query} 入门资料",
            "content": f"这是一段关于 {query} 的模拟资料。",
        },
        {
            "title": f"{query} 实践建议",
            "content": f"关于 {query} 的实践建议（模拟）。",
        },
    ]


def search_tool(query: str) -> list[SearchResult]:
    """统一检索入口。"""
    return mock_search_tool(query)
