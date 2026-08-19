# -*- coding: utf-8 -*-
"""节点：生成报告草稿和最终报告。

- generate_draft_report：基于总结生成草稿
- generate_final_report：依据人工反馈生成最终报告。
  批准 -> 直接使用草稿；驳回 -> 在草稿末尾追加人工修改意见。
"""

from app.state import ResearchState


def generate_draft_report(state: ResearchState) -> dict:
    return {
        "draft_report": f"《{state['topic']}》研究报告\n\n{state['summary']}"
    }


def generate_final_report(state: ResearchState) -> dict:
    if state["approved"]:
        return {"final_report": state["draft_report"]}

    comment = state["feedback_comment"] or "需要修改"
    return {"final_report": f"{state['draft_report']}\n人工修改意见：{comment}"}
