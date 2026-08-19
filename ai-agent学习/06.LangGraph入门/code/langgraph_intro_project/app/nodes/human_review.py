# -*- coding: utf-8 -*-
"""节点：人工确认与人工修改。

- interrupt()：暂停图执行，向调用方返回草稿等待确认
- 本节点只记录人工反馈（approved / approved_by / feedback_comment），
  最终报告由 generate_final_report 依据反馈生成
- 恢复执行时，本节点会从头重新运行，因此 interrupt() 之前不要放不可重复的副作用
- 人工反馈 payload：{"approved": bool, "comment": str, "approved_by": str}
"""

from langgraph.types import interrupt

from app.state import ResearchState


def human_review(state: ResearchState) -> dict:
    feedback = interrupt({
        "draft_report": state["draft_report"],
        "question": "是否批准这份报告？",
    })

    return {
        "approved": bool(feedback.get("approved", False)),
        "approved_by": str(feedback.get("approved_by", "")),
        "feedback_comment": str(feedback.get("comment", "")),
    }
