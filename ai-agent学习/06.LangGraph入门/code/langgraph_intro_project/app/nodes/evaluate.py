# -*- coding: utf-8 -*-
"""节点：评估总结质量，输出质量分和缺失点。

模拟模式下，为了让教程能看到"质量不达标 -> 补充检索"的业务循环，
当资料不足 4 份时质量分上限 60（低于达标线 80）。
"""

from app.config import USE_MOCK
from app.llm import Evaluation, evaluate_with_llm, mock_evaluate
from app.state import ResearchState


def evaluate_summary(state: ResearchState) -> dict:
    if USE_MOCK:
        result: Evaluation = mock_evaluate(state["summary"])
        # 模拟：资料不足时质量分偏低，便于演示业务循环
        if len(state["documents"]) < 4:
            result["quality_score"] = min(result["quality_score"], 60)
    else:
        result = evaluate_with_llm(state["summary"])

    return {
        "quality_score": result["quality_score"],
        "missing_points": result["missing_points"],
    }
