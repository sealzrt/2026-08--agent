# -*- coding: utf-8 -*-
"""节点：分析主题，生成研究问题，并决定是否需要检索。"""

from app.state import ResearchState


def build_questions(topic: str) -> list[str]:
    """纯业务函数：不依赖 LangGraph，方便测试。"""
    return [
        f"{topic} 是什么？",
        f"{topic} 的核心概念有哪些？",
        f"{topic} 适合哪些工程场景？",
    ]


def analyze_topic(state: ResearchState) -> dict:
    questions = build_questions(state["topic"])
    return {
        "questions": questions,
        "need_search": len(state["topic"]) > 8,
    }
