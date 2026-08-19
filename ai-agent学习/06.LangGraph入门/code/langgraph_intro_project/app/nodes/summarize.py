# -*- coding: utf-8 -*-
"""节点：基于资料生成总结。

节点根据 config.USE_MOCK 在模拟与真实模式之间切换，
业务逻辑本身不感知模型 SDK。
"""

from app.config import USE_MOCK
from app.llm import mock_summarize, summarize_with_llm
from app.state import ResearchState, SearchResult


def summarize_documents(state: ResearchState) -> dict:
    if USE_MOCK:
        summary = mock_summarize(state["topic"], state["documents"])
    else:
        summary = summarize_with_llm(state["topic"], state["documents"])
    return {"summary": summary}


# 兼容 md 中演示的纯业务函数包装方式
def mock_summarize_documents(state: ResearchState) -> dict[str, str]:
    return {"summary": mock_summarize(state["topic"], state["documents"])}
