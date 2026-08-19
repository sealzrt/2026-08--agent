# -*- coding: utf-8 -*-
"""09. 循环、重试与递归限制

业务循环由状态字段控制：
- iteration_count：当前轮次
- max_iterations：业务最大轮次
- quality_score：质量分，决定是否继续

recursion_limit 是 LangGraph 的运行时保护：
解决"代码写错时不要无限跑"，业务循环解决"什么时候应该停"。

运行方式：
    python step_by_step/09_loop_and_limit.py

练习任务：
- 把达标分数从 80 改为 90，观察循环次数变化。
- 增加 risk_note 字段：达到最大次数仍不达标时，报告里标记风险。
"""

from typing import Literal, TypedDict

from langgraph.graph import END, START, StateGraph


class ResearchState(TypedDict):
    topic: str
    documents: list[str]
    summary: str
    quality_score: int
    iteration_count: int
    max_iterations: int


def search_documents(state: ResearchState) -> dict[str, object]:
    next_count = state["iteration_count"] + 1
    return {
        "documents": state["documents"] + [f"第 {next_count} 轮检索资料"],
        "iteration_count": next_count,
    }


def summarize_documents(state: ResearchState) -> dict[str, str]:
    return {"summary": f"基于 {len(state['documents'])} 份资料生成总结"}


def evaluate_summary(state: ResearchState) -> dict[str, int]:
    score = min(50 + len(state["documents"]) * 20, 95)
    return {"quality_score": score}


def route_after_evaluation(state: ResearchState) -> Literal["retry", "finish"]:
    if state["quality_score"] >= 80:
        return "finish"
    if state["iteration_count"] >= state["max_iterations"]:
        return "finish"
    return "retry"


builder = StateGraph(ResearchState)
builder.add_node("search_documents", search_documents)
builder.add_node("summarize_documents", summarize_documents)
builder.add_node("evaluate_summary", evaluate_summary)

builder.add_edge(START, "search_documents")
builder.add_edge("search_documents", "summarize_documents")
builder.add_edge("summarize_documents", "evaluate_summary")
builder.add_conditional_edges(
    "evaluate_summary",
    route_after_evaluation,
    {"retry": "search_documents", "finish": END},
)

graph = builder.compile()


if __name__ == "__main__":
    result = graph.invoke(
        {
            "topic": "LangGraph",
            "documents": [],
            "summary": "",
            "quality_score": 0,
            "iteration_count": 0,
            "max_iterations": 3,
        },
        {"recursion_limit": 20},
    )
    print(result)
