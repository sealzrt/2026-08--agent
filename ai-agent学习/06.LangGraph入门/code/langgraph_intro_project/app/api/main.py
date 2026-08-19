# -*- coding: utf-8 -*-
"""最小部署接口（教程演示，内存存储 + 同步执行）。

    POST /tasks                       创建任务
    GET  /tasks/{task_id}             查询任务状态
    POST /tasks/{task_id}/feedback    提交人工反馈
    GET  /tasks/{task_id}/events      获取事件
    GET  /tasks/{task_id}/report      获取最终报告

生产注意事项：
- 教程同步执行图；真实项目应改为：API 创建任务 -> 队列投递 ->
  Worker 执行图 -> 状态写入存储 -> 前端订阅事件。
- 内存字典存储仅用于演示，应替换为数据库。
"""

import threading
from typing import Any, TypedDict
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from langgraph.types import Command

from app.api.schemas import (
    CreateTaskRequest,
    FeedbackRequest,
    FeedbackResponse,
    TaskResponse,
)
from app.config import MAX_ITERATIONS, RECURSION_LIMIT
from app.graph import GRAPH
from app.state import build_initial_state


class TaskRecord(TypedDict):
    status: str
    thread_id: str
    topic: str
    result: dict | None
    error: str | None
    interrupt: dict[str, Any] | None


app = FastAPI(title="LangGraph 资料检索与总结 Agent")

_TASKS: dict[str, TaskRecord] = {}
_LOCK = threading.Lock()


def _new_task_id() -> str:
    return f"task-{uuid4().hex[:12]}"


def _thread_config(thread_id: str) -> dict:
    return {
        "configurable": {"thread_id": thread_id},
        "recursion_limit": RECURSION_LIMIT,
    }


def _get_task_snapshot(task_id: str) -> TaskRecord | None:
    with _LOCK:
        task = _TASKS.get(task_id)
        return dict(task) if task is not None else None


@app.post("/tasks", response_model=TaskResponse)
def create_task(request: CreateTaskRequest) -> TaskResponse:
    task_id = _new_task_id()
    with _LOCK:
        _TASKS[task_id] = TaskRecord(
            status="running",
            thread_id=task_id,
            topic=request.topic,
            result=None,
            error=None,
            interrupt=None,
        )

    config = _thread_config(task_id)
    state = build_initial_state(request.topic, MAX_ITERATIONS)

    try:
        result = GRAPH.invoke(state, config)
        if "__interrupt__" in result:
            # 图在 human_review 处中断，等待前端提交反馈
            interrupt = result["__interrupt__"][0]
            with _LOCK:
                _TASKS[task_id]["status"] = "interrupted"
                _TASKS[task_id]["interrupt"] = {
                    "id": getattr(interrupt, "id", ""),
                    "value": getattr(interrupt, "value", {}),
                }
        else:
            with _LOCK:
                _TASKS[task_id]["status"] = "completed"
                _TASKS[task_id]["result"] = result
                _TASKS[task_id]["interrupt"] = None
    except Exception as exc:
        with _LOCK:
            _TASKS[task_id]["status"] = "failed"
            _TASKS[task_id]["error"] = str(exc)

    return _to_response(task_id)


@app.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(task_id: str) -> TaskResponse:
    task = _get_task_snapshot(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    return _to_response(task_id)


@app.post("/tasks/{task_id}/feedback", response_model=FeedbackResponse)
def submit_feedback(task_id: str, request: FeedbackRequest) -> FeedbackResponse:
    task = _get_task_snapshot(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    if task["status"] != "interrupted":
        raise HTTPException(status_code=400, detail="任务不在等待人工反馈状态")

    resume = {
        "approved": request.approved,
        "comment": request.comment,
        "approved_by": request.approved_by,
    }
    try:
        result = GRAPH.invoke(
            Command(resume=resume),
            _thread_config(task["thread_id"]),
        )
        if "__interrupt__" in result:
            interrupt = result["__interrupt__"][0]
            with _LOCK:
                _TASKS[task_id]["status"] = "interrupted"
                _TASKS[task_id]["interrupt"] = {
                    "id": getattr(interrupt, "id", ""),
                    "value": getattr(interrupt, "value", {}),
                }
        else:
            with _LOCK:
                _TASKS[task_id]["status"] = "completed"
                _TASKS[task_id]["result"] = result
                _TASKS[task_id]["interrupt"] = None
    except Exception as exc:
        with _LOCK:
            _TASKS[task_id]["status"] = "failed"
            _TASKS[task_id]["error"] = str(exc)

    return FeedbackResponse(task_id=task_id, status=_TASKS[task_id]["status"])


@app.get("/tasks/{task_id}/report", response_model=TaskResponse)
def get_report(task_id: str) -> TaskResponse:
    task = _get_task_snapshot(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    if task["status"] != "completed":
        raise HTTPException(status_code=400, detail="任务尚未完成")
    return _to_response(task_id)


@app.get("/tasks/{task_id}/events")
def get_events(task_id: str) -> dict[str, Any]:
    task = _get_task_snapshot(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    # 教程返回空事件；生产环境可对接 graph.stream(stream_mode="updates")
    # 或 stream_events(version="v3") 后通过 SSE 推送
    interrupt = task.get("interrupt") or {}
    events: list[dict[str, Any]] = []
    if interrupt:
        events.append({"type": "interrupt", "data": interrupt})
    return {"task_id": task_id, "status": task["status"], "events": events}


def _to_response(task_id: str) -> TaskResponse:
    task = _get_task_snapshot(task_id) or _TASKS[task_id]
    result = task.get("result") or {}
    interrupt = task.get("interrupt") or {}
    interrupt_value = interrupt.get("value") or {}
    errors = list(result.get("errors", []))
    if task.get("error"):
        errors = [task["error"], *errors]
    return TaskResponse(
        task_id=task_id,
        status=task["status"],
        topic=task["topic"],
        quality_score=result.get("quality_score", 0),
        approved=bool(result.get("approved", False)),
        approved_by=result.get("approved_by", ""),
        feedback_comment=result.get("feedback_comment", ""),
        approved_at=result.get("approved_at", ""),
        missing_points=result.get("missing_points", []),
        risk_note=result.get("risk_note", ""),
        draft_report=result.get("draft_report", interrupt_value.get("draft_report", "")),
        final_report=result.get("final_report", ""),
        interrupt_id=interrupt.get("id", ""),
        interrupt_question=interrupt_value.get("question", ""),
        errors=errors,
        error=task.get("error") or "",
    )
