# -*- coding: utf-8 -*-
"""08. LLM 调用与提示词组织（模拟模式）

模拟模式不调用真实模型，用固定逻辑返回结构化数据。
适合写教程、测试和调试流程。

- Prompt 是接口契约：明确模型输入和输出
- 用结构化输出降低解析风险
- 模拟模式保证可复现

运行方式：
    python step_by_step/08_llm_mock.py

练习任务：
- 修改 mock_evaluate()，让总结包含"风险"时加 10 分。
- 用 Pydantic 定义结构化输出模型，并校验模型返回值。
"""

from typing import TypedDict

from langgraph.graph import END, START, StateGraph


class SearchResult(TypedDict):
    title: str
    content: str


class Evaluation(TypedDict):
    quality_score: int
    missing_points: list[str]


class ResearchState(TypedDict):
    topic: str
    documents: list[SearchResult]
    summary: str
    quality_score: int
    missing_points: list[str]


def mock_summarize(topic: str, documents: list[SearchResult]) -> str:
    titles = "、".join(doc["title"] for doc in documents)
    return f"主题《{topic}》的总结。参考资料：{titles}"


def mock_evaluate(summary: str) -> Evaluation:
    if len(summary) > 40:
        return {"quality_score": 85, "missing_points": []}
    return {"quality_score": 60, "missing_points": ["总结太短"]}


def summarize_documents(state: ResearchState) -> dict[str, str]:
    return {
        "summary": mock_summarize(state["topic"], state["documents"])
    }


def evaluate_summary(state: ResearchState) -> dict[str, object]:
    result = mock_evaluate(state["summary"])
    return {
        "quality_score": result["quality_score"],
        "missing_points": result["missing_points"],
    }


builder = StateGraph(ResearchState)
builder.add_node("summarize_documents", summarize_documents)
builder.add_node("evaluate_summary", evaluate_summary)
builder.add_edge(START, "summarize_documents")
builder.add_edge("summarize_documents", "evaluate_summary")
builder.add_edge("evaluate_summary", END)

graph = builder.compile()


if __name__ == "__main__":
    result = graph.invoke({
        "topic": "LangGraph",
        "documents": [
            {"title": "LangGraph 入门资料", "content": "关于 LangGraph 的模拟资料。"},
            {"title": "LangGraph 实战资料", "content": "关于 LangGraph 实战的模拟资料。"},
        ],
        "summary": "",
        "quality_score": 0,
        "missing_points": [],
    })
    print(result)
