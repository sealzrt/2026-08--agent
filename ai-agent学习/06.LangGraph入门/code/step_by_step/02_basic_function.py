# -*- coding: utf-8 -*-
"""02. Python 最小基础

一个普通 Python 函数版的资料总结流程：
- 字典作为状态载体
- 类型标注 / TypedDict 描述数据结构
- 直接运行即可看到结果

运行方式：
    python step_by_step/02_basic_function.py

练习任务：
- 给 ResearchState 增加 documents: list[str] 字段，并在 run() 中返回它。
- 把 topic 改成从命令行输入，例如使用 input()。
"""

from typing import TypedDict


class ResearchState(TypedDict):
    topic: str
    summary: str


def generate_summary(topic: str) -> str:
    return f"这是关于《{topic}》的入门总结。"


def run(state: ResearchState) -> ResearchState:
    summary = generate_summary(state["topic"])
    return {
        "topic": state["topic"],
        "summary": summary,
    }


def main() -> None:
    initial_state: ResearchState = {
        "topic": "LangGraph 适合做什么",
        "summary": "",
    }
    result = run(initial_state)
    print(result["summary"])


if __name__ == "__main__":
    main()
