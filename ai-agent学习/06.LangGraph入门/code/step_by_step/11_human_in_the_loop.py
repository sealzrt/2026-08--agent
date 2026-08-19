# -*- coding: utf-8 -*-
"""11. Human-in-the-loop：人工确认与人工修改

- interrupt()：暂停图执行，向调用方返回需要人工处理的数据
- Command(resume=...)：把人工反馈传回图中，恢复执行
- 恢复执行时，会从触发 interrupt() 的节点开头重新运行，
  因此 interrupt() 前面的副作用必须幂等

运行方式：
    python step_by_step/11_human_in_the_loop.py

练习任务：
- 增加 approved_by 字段，记录审批人。
- 增加"驳回后重新总结"的分支，而不是直接生成最终报告。
"""

from typing import TypedDict

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt


class ResearchState(TypedDict):
    topic: str
    draft_report: str
    final_report: str


def write_draft(state: ResearchState) -> dict[str, str]:
    return {"draft_report": f"《{state['topic']}》的报告草稿"}


def human_review(state: ResearchState) -> dict[str, str]:
    feedback = interrupt({
        "draft_report": state["draft_report"],
        "question": "是否批准这份报告？",
    })

    if feedback.get("approved"):
        return {"final_report": state["draft_report"]}

    comment = feedback.get("comment", "需要修改")
    return {"final_report": f"{state['draft_report']}\n人工修改意见：{comment}"}


builder = StateGraph(ResearchState)
builder.add_node("write_draft", write_draft)
builder.add_node("human_review", human_review)
builder.add_edge(START, "write_draft")
builder.add_edge("write_draft", "human_review")
builder.add_edge("human_review", END)

checkpointer = InMemorySaver()
graph = builder.compile(checkpointer=checkpointer)


if __name__ == "__main__":
    config = {"configurable": {"thread_id": "review-001"}}

    first = graph.invoke(
        {"topic": "LangGraph HITL", "draft_report": "", "final_report": ""},
        config,
    )
    print(first)

    resumed = graph.invoke(
        Command(resume={"approved": False, "comment": "补充风险说明"}),
        config | {"recursion_limit": 20},
    )
    print(resumed)
