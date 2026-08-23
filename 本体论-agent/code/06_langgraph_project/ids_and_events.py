# """演示 user_id、task_id、thread_id、turn_id 和事件记录的关系。"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import uuid4


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass(frozen=True)
class TaskRecord:
    user_id: str
    task_id: str
    thread_id: str
    status: str = "created"


@dataclass(frozen=True)
class RunRecord:
    task_id: str
    run_id: str
    turn_id: str
    status: str = "running"


@dataclass(frozen=True)
class EventRecord:
    task_id: str
    run_id: str
    event_type: str
    payload: dict[str, str]
    event_id: str = field(default_factory=lambda: f"event-{uuid4().hex[:8]}")
    created_at: str = field(default_factory=now_iso)


def create_task(user_id: str, topic: str) -> tuple[TaskRecord, RunRecord, EventRecord]:
    task_id = f"task-{uuid4().hex[:8]}"
    thread_id = f"thread-{uuid4().hex[:8]}"
    run_id = f"run-{uuid4().hex[:8]}"
    turn_id = "turn-001"
    task = TaskRecord(user_id=user_id, task_id=task_id, thread_id=thread_id)
    run = RunRecord(task_id=task_id, run_id=run_id, turn_id=turn_id)
    event = EventRecord(task_id, run_id, "user_message", {"text": topic})
    return task, run, event


def main() -> None:
    task, run, event = create_task("user-001", "诊断产品 A 登录失败")
    print(task)
    print(run)
    print(event)


if __name__ == "__main__":
    main()

