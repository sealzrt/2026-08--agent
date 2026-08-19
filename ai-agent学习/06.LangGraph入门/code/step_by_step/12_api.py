# -*- coding: utf-8 -*-
"""12. 流式输出与前端集成 —— FastAPI 最小接口

接口设计（本章只设计接口，不必一次性实现复杂前端）：

    POST /tasks                       创建任务
    GET  /tasks/{task_id}             查询任务状态
    POST /tasks/{task_id}/feedback    提交人工反馈
    GET  /tasks/{task_id}/events      获取事件流

运行方式：
    pip install fastapi uvicorn
    uvicorn step_by_step.12_api:app --reload
"""

from typing import TypedDict

from fastapi import FastAPI
from pydantic import BaseModel


app = FastAPI()


class CreateTaskRequest(BaseModel):
    topic: str


class FeedbackRequest(BaseModel):
    approved: bool
    comment: str = ""


# 教程用内存字典保存任务状态，生产环境应替换为数据库
_TASKS: dict[str, dict] = {}


def _new_task_id() -> str:
    return f"task-{len(_TASKS) + 1:03d}"


@app.post("/tasks")
def create_task(request: CreateTaskRequest) -> dict[str, str]:
    task_id = _new_task_id()
    _TASKS[task_id] = {"topic": request.topic, "status": "created"}
    return {"task_id": task_id}


@app.get("/tasks/{task_id}")
def get_task(task_id: str) -> dict[str, str]:
    task = _TASKS.get(task_id)
    if task is None:
        return {"task_id": task_id, "status": "not_found"}
    return {"task_id": task_id, "status": task["status"]}


@app.post("/tasks/{task_id}/feedback")
def submit_feedback(task_id: str, request: FeedbackRequest) -> dict[str, str]:
    task = _TASKS.get(task_id)
    if task is None:
        return {"task_id": task_id, "status": "not_found"}
    task["status"] = "feedback_received"
    return {"task_id": task_id, "status": "submitted"}


@app.get("/tasks/{task_id}/events")
def get_events(task_id: str) -> dict[str, object]:
    task = _TASKS.get(task_id)
    if task is None:
        return {"task_id": task_id, "events": []}
    # 教程返回空事件列表，后续可接入 SSE 事件流
    return {"task_id": task_id, "events": [], "status": task["status"]}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
