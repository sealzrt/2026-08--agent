# -*- coding: utf-8 -*-
"""状态结构：定义贯穿项目所有字段。

只在这里定义状态结构和公共类型，不写业务逻辑。
"""

from typing import TypedDict


class SearchResult(TypedDict):
    title: str
    content: str


class ResearchState(TypedDict):
    # 输入
    topic: str
    # 分析 / 检索
    questions: list[str]
    search_queries: list[str]
    need_search: bool
    # 资料
    documents: list[SearchResult]
    errors: list[str]
    # 总结与评分
    summary: str
    quality_score: int
    missing_points: list[str]
    risk_note: str
    # 循环控制
    iteration_count: int
    max_iterations: int
    # 报告与人工确认
    draft_report: str
    final_report: str
    approved: bool
    approved_by: str
    feedback_comment: str
    approved_at: str


def build_initial_state(topic: str, max_iterations: int) -> ResearchState:
    """构造一次任务初始状态。"""
    return {
        "topic": topic,
        "questions": [],
        "search_queries": [],
        "need_search": False,
        "documents": [],
        "errors": [],
        "summary": "",
        "quality_score": 0,
        "missing_points": [],
        "risk_note": "",
        "iteration_count": 0,
        "max_iterations": max_iterations,
        "draft_report": "",
        "final_report": "",
        "approved": False,
        "approved_by": "",
        "feedback_comment": "",
        "approved_at": "",
    }
