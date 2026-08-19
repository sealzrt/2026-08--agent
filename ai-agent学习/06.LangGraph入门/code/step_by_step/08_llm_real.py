# -*- coding: utf-8 -*-
"""08. LLM 调用与提示词组织（真实模式）

真实模式调用模型 API（OpenAI 兼容接口），用于验证实际效果。

- 模型调用封装在独立函数中，节点不直接拼大量 Prompt
- 提供 JSON 结构化输出，并对非 JSON 返回做兜底处理
- API Key 通过环境变量传入，不写死在代码里

运行方式：
    $env:OPENAI_API_KEY="你的 API Key"
    python step_by_step/08_llm_real.py

注意：
- 会受网络、成本和模型稳定性影响
- 换成其他 SDK（如 openai 包）时，只需替换 _call_llm() 内部实现
"""

import json
import os
import sys
import urllib.request
from typing import TypedDict

from langgraph.graph import END, START, StateGraph


class SearchResult(TypedDict):
    title: str
    content: str


class Evaluation(TypedDict):
    quality_score: int
    missing_points: list[str]


class ResearchState(TypedDict):
    topic: str
    documents: list[SearchResult]
    summary: str
    quality_score: int
    missing_points: list[str]


# ---------- LLM 调用层（可替换为任意模型 SDK） ----------

BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
API_KEY = os.getenv("OPENAI_API_KEY", "")
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


def _call_llm(prompt: str, json_response: bool = False) -> str:
    """调用 OpenAI 兼容 chat/completions 接口，返回模型文本。"""
    if not API_KEY:
        raise RuntimeError("未设置 OPENAI_API_KEY 环境变量")

    url = f"{BASE_URL.rstrip('/')}/chat/completions"
    payload: dict = {
        "model": MODEL,
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
            "Authorization": f"Bearer {API_KEY}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    return body["choices"][0]["message"]["content"]


# ---------- 业务函数：Prompt 是接口契约 ----------

def summarize_with_llm(topic: str, documents: list[SearchResult]) -> str:
    prompt = f"""
请基于资料总结主题：{topic}

资料：
{json.dumps(documents, ensure_ascii=False, indent=2)}

要求：
1. 用中文输出
2. 结构清晰
3. 不要编造资料中没有的信息
"""
    return _call_llm(prompt)


def evaluate_with_llm(summary: str) -> Evaluation:
    prompt = f"""
请评估以下总结的质量，输出 JSON：

{{
  "quality_score": 80,
  "missing_points": ["缺少部署说明"]
}}

总结：
{summary}
"""
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


# ---------- 节点函数 ----------

def summarize_documents(state: ResearchState) -> dict[str, str]:
    return {
        "summary": summarize_with_llm(state["topic"], state["documents"])
    }


def evaluate_summary(state: ResearchState) -> dict[str, object]:
    result = evaluate_with_llm(state["summary"])
    return {
        "quality_score": result["quality_score"],
        "missing_points": result["missing_points"],
    }


builder = StateGraph(ResearchState)
builder.add_node("summarize_documents", summarize_documents)
builder.add_node("evaluate_summary", evaluate_summary)
builder.add_edge(START, "summarize_documents")
builder.add_edge("summarize_documents", "evaluate_summary")
builder.add_edge("evaluate_summary", END)

graph = builder.compile()


if __name__ == "__main__":
    if not API_KEY:
        print("请先设置环境变量：$env:OPENAI_API_KEY=\"你的 API Key\"")
        sys.exit(1)

    result = graph.invoke({
        "topic": "LangGraph",
        "documents": [
            {"title": "LangGraph 入门资料", "content": "关于 LangGraph 的模拟资料。"},
        ],
        "summary": "",
        "quality_score": 0,
        "missing_points": [],
    })
    print(result)
