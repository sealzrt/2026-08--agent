# -*- coding: utf-8 -*-
"""API 请求 / 响应模型。"""

from pydantic import BaseModel, ConfigDict, Field


class CreateTaskRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    topic: str = Field(min_length=1, max_length=200)


class FeedbackRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    approved: bool
    comment: str = Field(default="", max_length=1000)
    approved_by: str = Field(default="", max_length=80)


class TaskResponse(BaseModel):
    task_id: str
    status: str
    topic: str = ""
    quality_score: int = 0
    approved: bool = False
    approved_by: str = ""
    feedback_comment: str = ""
    approved_at: str = ""
    missing_points: list[str] = Field(default_factory=list)
    risk_note: str = ""
    draft_report: str = ""
    final_report: str = ""
    interrupt_id: str = ""
    interrupt_question: str = ""
    errors: list[str] = Field(default_factory=list)
    error: str = ""


class FeedbackResponse(BaseModel):
    task_id: str
    status: str
