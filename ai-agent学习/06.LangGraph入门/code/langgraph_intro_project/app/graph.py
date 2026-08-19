# -*- coding: utf-8 -*-
"""图定义：集中创建、编译资料检索与总结 Agent 工作流。

流程：
    START
      -> analyze_topic
      -> [route_after_analysis]
          search   : plan_search -> search_documents
          summarize: 直接进入总结
      -> summarize_documents
      -> evaluate_summary
      -> [route_after_evaluation]
          retry : 回到 plan_search 补充检索
          finish: generate_draft_report -> human_review -> generate_final_report -> END
"""

from typing import Literal

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph

from app.config import MAX_ITERATIONS, QUALITY_THRESHOLD, RECURSION_LIMIT
from app.nodes.analyze import analyze_topic
from app.nodes.evaluate import evaluate_summary
from app.nodes.human_review import human_review
from app.nodes.report import generate_draft_report, generate_final_report
from app.nodes.search import plan_search, search_documents
from app.nodes.summarize import summarize_documents
from app.state import ResearchState


def route_after_analysis(state: ResearchState) -> Literal["search", "summarize"]:
    if state["need_search"]:
        return "search"
    return "summarize"


def route_after_evaluation(state: ResearchState) -> Literal["retry", "finish"]:
    if state["quality_score"] >= QUALITY_THRESHOLD:
        return "finish"
    if state["iteration_count"] >= state["max_iterations"]:
        return "finish"
    return "retry"


def build_graph():
    builder = StateGraph(ResearchState)

    builder.add_node("analyze_topic", analyze_topic)
    builder.add_node("plan_search", plan_search)
    builder.add_node("search_documents", search_documents)
    builder.add_node("summarize_documents", summarize_documents)
    builder.add_node("evaluate_summary", evaluate_summary)
    builder.add_node("generate_draft_report", generate_draft_report)
    builder.add_node("human_review", human_review)
    builder.add_node("generate_final_report", generate_final_report)

    builder.add_edge(START, "analyze_topic")
    builder.add_conditional_edges(
        "analyze_topic",
        route_after_analysis,
        {"search": "plan_search", "summarize": "summarize_documents"},
    )
    builder.add_edge("plan_search", "search_documents")
    builder.add_edge("search_documents", "summarize_documents")
    builder.add_edge("summarize_documents", "evaluate_summary")
    builder.add_conditional_edges(
        "evaluate_summary",
        route_after_evaluation,
        {"retry": "plan_search", "finish": "generate_draft_report"},
    )
    builder.add_edge("generate_draft_report", "human_review")
    builder.add_edge("human_review", "generate_final_report")
    builder.add_edge("generate_final_report", END)

    # 教程使用内存型 checkpointer；生产环境请替换为 SQLite / Postgres 持久化
    checkpointer = InMemorySaver()
    return builder.compile(checkpointer=checkpointer)


# 模块级单例，API / 脚本共用
GRAPH = build_graph()


if __name__ == "__main__":
    from app.state import build_initial_state

    from langgraph.types import Command

    config = {"configurable": {"thread_id": "graph-demo"}}
    state = build_initial_state("LangGraph 入门", MAX_ITERATIONS)
    result = GRAPH.invoke(state, config | {"recursion_limit": RECURSION_LIMIT})
    # langgraph 1.x：图被 interrupt 时 invoke 不抛异常，
    # 而是返回带 __interrupt__ 键的状态，用 Command(resume=...) 恢复
    if "__interrupt__" in result:
        result = GRAPH.invoke(
            Command(resume={"approved": True, "approved_by": "演示"}),
            config | {"recursion_limit": RECURSION_LIMIT},
        )
    print(result["final_report"])
