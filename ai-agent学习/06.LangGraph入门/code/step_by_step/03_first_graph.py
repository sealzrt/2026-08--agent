# -*- coding: utf-8 -*-
"""03. 第一个 LangGraph Hello World

把一个普通函数包装成 StateGraph：
- 节点 = 业务步骤（普通 Python 函数）
- 边 = 流程顺序
- State = 共享上下文

运行方式：
    pip install langgraph
    python step_by_step/03_first_graph.py

练习任务：
- 修改节点名称为 write_summary，并同步修改边。
- 增加第二个节点 format_summary，让流程变成
  START -> generate_summary -> format_summary -> END。
"""

from typing import TypedDict

from langgraph.graph import END, START, StateGraph


class ResearchState(TypedDict):
    topic: str
    summary: str


def generate_summary(state: ResearchState) -> dict[str, str]:
    return {
        "summary": f"这是关于《{state['topic']}》的 LangGraph 入门总结。"
    }


builder = StateGraph(ResearchState)
builder.add_node("generate_summary", generate_summary)
builder.add_edge(START, "generate_summary")
builder.add_edge("generate_summary", END)

graph = builder.compile()


if __name__ == "__main__":
    result = graph.invoke({
        "topic": "LangGraph 适合做什么",
        "summary": "",
    })
    print(result)
