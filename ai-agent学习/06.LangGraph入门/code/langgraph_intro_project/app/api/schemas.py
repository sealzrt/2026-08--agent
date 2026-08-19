# -*- coding: utf-8 -*-
"""API 请求 / 响应模型。"""

from pydantic import BaseModel


class CreateTaskRequest(BaseModel):
    topic: str


class FeedbackRequest(BaseModel):
    approved: bool
    comment: str = ""
    approved_by: str = ""


class TaskResponse(BaseModel):
    task_id: str
    status: str
    topic: str = ""
    final_report: str = ""


class FeedbackResponse(BaseModel):
    task_id: str
    status: str
