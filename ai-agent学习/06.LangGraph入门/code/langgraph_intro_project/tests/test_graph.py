# -*- coding: utf-8 -*-
"""图级集成测试：运行完整图，验证最终状态。

运行方式：
    pytest
"""

from langgraph.types import Command

from app.config import MAX_ITERATIONS, RECURSION_LIMIT
from app.graph import build_graph
from app.state import build_initial_state


def _run_with_approval(graph, config, state, resume=None):
    """执行图；若在 human_review 中断，用给定反馈恢复。"""
    result = graph.invoke(state, config | {"recursion_limit": RECURSION_LIMIT})
    if "__interrupt__" in result:
        return graph.invoke(
            Command(resume=resume or {"approved": True, "approved_by": "集成测试"}),
            config | {"recursion_limit": RECURSION_LIMIT},
        )
    return result


def test_graph_generates_report_after_approval() -> None:
    graph = build_graph()
    config = {"configurable": {"thread_id": "test-integration-001"}}
    state = build_initial_state("LangGraph 集成测试", MAX_ITERATIONS)

    resumed = _run_with_approval(graph, config, state)
    assert resumed["final_report"]
    assert resumed["approved"] is True
    assert resumed["approved_by"] == "集成测试"


def test_graph_rejects_and_appends_comment() -> None:
    graph = build_graph()
    config = {"configurable": {"thread_id": "test-integration-003"}}
    state = build_initial_state("LangGraph 集成测试", MAX_ITERATIONS)

    resumed = _run_with_approval(
        graph,
        config,
        state,
        resume={"approved": False, "comment": "补充风险说明", "approved_by": "测试"},
    )
    assert "补充风险说明" in resumed["final_report"]
    assert resumed["approved"] is False


def test_graph_uses_business_loop_for_short_topic() -> None:
    """短主题（len <= 8）不需要检索，直接总结，但也要生成最终报告。"""
    graph = build_graph()
    config = {"configurable": {"thread_id": "test-integration-002"}}
    state = build_initial_state("短主题", MAX_ITERATIONS)

    resumed = _run_with_approval(graph, config, state)
    assert resumed["final_report"]
