# -*- coding: utf-8 -*-
"""LLM 调用层：模拟 + 真实两种模式，均返回结构化数据。

- Prompt 独立存放在 app/prompts/*.md，便于修改和评审
- 真实模式调用 OpenAI 兼容接口，节点不直接拼大量 Prompt
- 模拟模式保证教程、测试、调试可复现
"""

import json
import urllib.request
from pathlib import Path
from typing import TypedDict

from app.config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
from app.state import SearchResult


class Evaluation(TypedDict):
    quality_score: int
    missing_points: list[str]


PROMPT_DIR = Path(__file__).resolve().parent / "prompts"


def load_prompt(name: str) -> str:
    """读取 app/prompts/{name}.md 内容。"""
    return (PROMPT_DIR / f"{name}.md").read_text(encoding="utf-8")


# ---------- 模拟模式 ----------

def mock_summarize(topic: str, documents: list[SearchResult]) -> str:
    titles = "、".join(doc["title"] for doc in documents)
    return f"主题《{topic}》的总结。参考资料：{titles}"


def mock_evaluate(summary: str) -> Evaluation:
    if len(summary) > 40:
        return {"quality_score": 85, "missing_points": []}
    return {"quality_score": 60, "missing_points": ["总结太短"]}


# ---------- 真实模式 ----------

def _call_llm(prompt: str, json_response: bool = False) -> str:
    """调用 OpenAI 兼容 chat/completions 接口，返回模型文本。

    换成其他 SDK 时只需替换本函数内部实现。
    """
    if not OPENAI_API_KEY:
        raise RuntimeError("未设置 OPENAI_API_KEY（可在 .env 中配置）")

    url = f"{OPENAI_BASE_URL.rstrip('/')}/chat/completions"
    payload: dict = {
        "model": OPENAI_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
    }
    if json_response:
        payload["response_format"] = {"type": "json_object"}

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    return body["choices"][0]["message"]["content"]


def summarize_with_llm(topic: str, documents: list[SearchResult]) -> str:
    prompt = load_prompt("summarize").format(
        topic=topic,
        documents=json.dumps(documents, ensure_ascii=False, indent=2),
    )
    return _call_llm(prompt)


def evaluate_with_llm(summary: str) -> Evaluation:
    prompt = load_prompt("evaluate").format(summary=summary)
    text = _call_llm(prompt, json_response=True)

    # 兜底处理：模型返回非 JSON 时流程不能直接崩溃
    try:
        data = json.loads(text)
        return {
            "quality_score": int(data.get("quality_score", 0)),
            "missing_points": list(data.get("missing_points", [])),
        }
    except (json.JSONDecodeError, TypeError, ValueError):
        return {"quality_score": 0, "missing_points": ["模型输出不是合法 JSON"]}
