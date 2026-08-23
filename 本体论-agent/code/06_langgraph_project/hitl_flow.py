# """用标准库模拟 HITL 的暂停返回结构和恢复反馈。"""

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class InterruptPayload:
    value: dict[str, Any]
    id: str


def human_review_node(state: dict[str, Any], resume: dict[str, Any] | None = None) -> dict[str, Any]:
    if resume is None:
        interrupt = InterruptPayload(
            value={
                "task_id": state["task_id"],
                "action": state["pending_action"],
                "question": "是否批准这次高风险修复？",
            },
            id="interrupt-001",
        )
        return {**state, "status": "waiting_for_approval", "__interrupt__": [interrupt]}
    if not resume.get("approved"):
        return {**state, "status": "rejected", "approval": resume}
    return {**state, "status": "approved", "approval": resume}


def main() -> None:
    state = {"task_id": "task-login-001", "pending_action": "apply_config_change"}
    first = human_review_node(state)
    interrupt = first["__interrupt__"][0]
    print("paused:", interrupt.id, interrupt.value["question"])
    resumed = human_review_node(state, {"approved": True, "comment": "同意 dry_run 后执行"})
    print("resumed:", resumed["status"], resumed["approval"])


if __name__ == "__main__":
    main()

