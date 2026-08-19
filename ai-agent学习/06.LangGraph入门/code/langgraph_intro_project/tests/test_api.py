# -*- coding: utf-8 -*-
"""API 测试：验证任务创建、事件暴露和反馈校验。"""

from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api import main as api_main


client = TestClient(api_main.app)


def teardown_function() -> None:
    api_main._TASKS.clear()


def test_create_task_returns_rich_response(monkeypatch) -> None:
    def fake_invoke(state, config):
        return {
            "summary": "总结",
            "quality_score": 88,
            "missing_points": [],
            "risk_note": "",
            "approved": True,
            "approved_by": "测试",
            "feedback_comment": "",
            "approved_at": "2026-08-19T00:00:00Z",
            "draft_report": "草稿",
            "final_report": "最终报告",
            "errors": [],
        }

    monkeypatch.setattr(api_main.GRAPH, "invoke", fake_invoke)

    response = client.post("/tasks", json={"topic": "LangGraph 入门"})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "completed"
    assert body["quality_score"] == 88
    assert body["approved"] is True
    assert body["final_report"] == "最终报告"


def test_create_task_exposes_interrupt_event(monkeypatch) -> None:
    def fake_invoke(state, config):
        return {
            "__interrupt__": [
                SimpleNamespace(
                    id="interrupt-1",
                    value={"draft_report": "草稿", "question": "批准吗？"},
                )
            ]
        }

    monkeypatch.setattr(api_main.GRAPH, "invoke", fake_invoke)

    response = client.post("/tasks", json={"topic": "LangGraph 入门"})
    assert response.status_code == 200
    body = response.json()
    task_id = body["task_id"]
    assert body["status"] == "interrupted"
    assert body["interrupt_id"] == "interrupt-1"
    assert body["interrupt_question"] == "批准吗？"
    assert body["draft_report"] == "草稿"

    events = client.get(f"/tasks/{task_id}/events")
    assert events.status_code == 200
    events_body = events.json()
    assert events_body["events"][0]["type"] == "interrupt"


def test_feedback_rejects_completed_task(monkeypatch) -> None:
    def fake_invoke(state, config):
        return {
            "summary": "总结",
            "quality_score": 88,
            "missing_points": [],
            "risk_note": "",
            "approved": True,
            "approved_by": "测试",
            "feedback_comment": "",
            "approved_at": "2026-08-19T00:00:00Z",
            "draft_report": "草稿",
            "final_report": "最终报告",
            "errors": [],
        }

    monkeypatch.setattr(api_main.GRAPH, "invoke", fake_invoke)

    response = client.post("/tasks", json={"topic": "LangGraph 入门"})
    task_id = response.json()["task_id"]

    feedback = client.post(
        f"/tasks/{task_id}/feedback",
        json={"approved": True, "comment": "", "approved_by": "测试"},
    )
    assert feedback.status_code == 400
