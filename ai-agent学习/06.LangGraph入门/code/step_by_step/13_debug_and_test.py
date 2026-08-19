# -*- coding: utf-8 -*-
"""13. 调试、观测与测试

- log_node：给节点包装日志，输出节点名、耗时、输出字段
- 单元测试：只测单个函数（如 evaluate_summary）
- 集成测试：运行完整图，验证最终状态

测试策略：
- 测结构，不强测具体文案
- 模拟模式用于稳定测试
- 真实模式用于人工验收或少量集成验证

运行方式：
    python step_by_step/13_debug_and_test.py
    # 或安装 pytest 后：pytest step_by_step/13_debug_and_test.py

练习任务：
- 为 evaluate_summary 写两个测试：达标和不达标。
- 给每个节点包装日志，并输出耗时。
"""

import logging
import time
from collections.abc import Callable
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


class ResearchState(TypedDict):
    topic: str
    documents: list[str]
    summary: str
    quality_score: int


# ---------- 业务节点 ----------

def summarize_documents(state: ResearchState) -> dict[str, str]:
    return {"summary": f"基于 {len(state['documents'])} 份资料总结：{state['topic']}"}


def evaluate_summary(state: ResearchState) -> dict[str, int]:
    summary = state["summary"]
    if len(summary) > 40:
        return {"quality_score": 85}
    return {"quality_score": 60}


# ---------- 日志包装器 ----------

def log_node(name: str, fn: Callable[[dict[str, Any]], dict[str, Any]]):
    def wrapper(state: dict[str, Any]) -> dict[str, Any]:
        started = time.perf_counter()
        try:
            result = fn(state)
            duration_ms = int((time.perf_counter() - started) * 1000)
            logger.info(
                "node=%s duration_ms=%s output_keys=%s",
                name,
                duration_ms,
                list(result.keys()),
            )
            return result
        except Exception:
            logger.exception("node=%s failed", name)
            raise

    return wrapper


# ---------- 图 ----------

builder = StateGraph(ResearchState)
builder.add_node("summarize_documents", log_node("summarize_documents", summarize_documents))
builder.add_node("evaluate_summary", log_node("evaluate_summary", evaluate_summary))
builder.add_edge(START, "summarize_documents")
builder.add_edge("summarize_documents", "evaluate_summary")
builder.add_edge("evaluate_summary", END)

graph = builder.compile()


INITIAL_STATE: ResearchState = {
    "topic": "LangGraph 调试",
    "documents": ["资料一", "资料二", "资料三"],
    "summary": "",
    "quality_score": 0,
}


# ---------- 测试 ----------

def test_evaluate_summary_passes() -> None:
    # 注意：达标线是 len(summary) > 40，示例文本需足够长
    state = {"summary": "这是一段足够长的总结，包含背景、用途和风险，还覆盖了实施步骤、验证方法以及部署注意事项。"}
    result = evaluate_summary(state)  # type: ignore[arg-type]
    assert result["quality_score"] >= 80


def test_evaluate_summary_fails() -> None:
    state = {"summary": "太短"}
    result = evaluate_summary(state)  # type: ignore[arg-type]
    assert result["quality_score"] < 80


def test_graph_generates_report() -> None:
    result = graph.invoke(dict(INITIAL_STATE), {"recursion_limit": 20})
    assert result["summary"]
    assert result["quality_score"] > 0


if __name__ == "__main__":
    test_evaluate_summary_passes()
    test_evaluate_summary_fails()
    test_graph_generates_report()
    print("\n所有测试通过。\n")

    result = graph.invoke(dict(INITIAL_STATE), {"recursion_limit": 20})
    print(result)
