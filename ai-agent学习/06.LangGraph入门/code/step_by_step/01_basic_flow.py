# -*- coding: utf-8 -*-
"""01. LangGraph 是什么的普通 Python 演示。"""


def run_research_agent(topic: str) -> str:
    if len(topic) < 10:
        return f"主题较简单，直接生成总结：{topic}"

    documents = ["模拟资料 A", "模拟资料 B"]
    summary = f"基于 {len(documents)} 份资料生成总结：{topic}"
    return summary


if __name__ == "__main__":
    print(run_research_agent("LangGraph 适合做什么"))
