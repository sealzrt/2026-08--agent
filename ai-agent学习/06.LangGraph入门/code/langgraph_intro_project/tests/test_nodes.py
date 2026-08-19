# -*- coding: utf-8 -*-
"""节点单元测试：只测单个函数，验证输入输出结构。

运行方式：
    pytest
"""

from app.config import MAX_ITERATIONS
from app.nodes.analyze import analyze_topic, build_questions
from app.nodes.evaluate import evaluate_summary
from app.nodes.report import generate_draft_report, generate_final_report
from app.nodes.search import plan_search, search_documents
from app.nodes.summarize import mock_summarize_documents
from app.state import build_initial_state


def _state(topic: str = "LangGraph 入门"):
    return build_initial_state(topic, MAX_ITERATIONS)


def test_build_questions_structure() -> None:
    questions = build_questions("LangGraph")
    assert len(questions) == 3
    assert "LangGraph" in questions[0]


def test_analyze_topic_structure() -> None:
    result = analyze_topic(_state())
    assert isinstance(result["questions"], list)
    assert isinstance(result["need_search"], bool)
    assert len(result["questions"]) == 3


def test_plan_search_structure() -> None:
    state = _state()
    state["questions"] = build_questions("LangGraph")
    result = plan_search(state)
    assert len(result["search_queries"]) == len(state["questions"])


def test_search_documents_structure() -> None:
    state = _state()
    state["questions"] = build_questions("LangGraph")
    state["search_queries"] = [f"LangGraph {q}" for q in state["questions"]]
    result = search_documents(state)
    assert isinstance(result["documents"], list)
    assert len(result["documents"]) > 0
    assert isinstance(result["documents"][0]["title"], str)
    assert result["iteration_count"] == 1


def test_summarize_documents_structure() -> None:
    state = _state()
    state["documents"] = [
        {"title": "LangGraph 入门资料", "content": "模拟资料内容"}
    ]
    result = mock_summarize_documents(state)
    assert result["summary"]


def test_evaluate_summary_passes() -> None:
    state = _state()
    state["documents"] = [
        {"title": f"资料{i}", "content": "内容"} for i in range(4)
    ]
    # 达标线是 len(summary) > 40，示例文本需足够长
    state["summary"] = "这是一段足够长的总结，包含背景、用途和风险，还覆盖了实施步骤、验证方法以及部署注意事项。"
    result = evaluate_summary(state)
    assert result["quality_score"] >= 80
    assert isinstance(result["missing_points"], list)


def test_evaluate_summary_fails_when_not_enough_documents() -> None:
    state = _state()
    state["documents"] = [
        {"title": "资料1", "content": "内容"}
    ]
    state["summary"] = "这是一段足够长的总结，包含背景、用途和风险。"
    result = evaluate_summary(state)
    assert result["quality_score"] < 80


def test_report_structure() -> None:
    state = _state()
    state["summary"] = "总结内容"
    draft = generate_draft_report(state)
    assert draft["draft_report"]

    # 批准：最终报告直接使用草稿
    state["draft_report"] = draft["draft_report"]
    state["approved"] = True
    final = generate_final_report(state)
    assert final["final_report"] == state["draft_report"]

    # 驳回：最终报告追加人工修改意见
    state["approved"] = False
    state["feedback_comment"] = "补充风险说明"
    final2 = generate_final_report(state)
    assert "补充风险说明" in final2["final_report"]
