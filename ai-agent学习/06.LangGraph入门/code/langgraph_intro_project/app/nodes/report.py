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
    parts = [state["draft_report"]]

    if state["risk_note"]:
        parts.append(f"风险提示：{state['risk_note']}")

    if state["approved"]:
        return {"final_report": "\n".join(parts)}

    comment = state["feedback_comment"] or "需要修改"
    parts.append(f"人工修改意见：{comment}")
    return {"final_report": "\n".join(parts)}
