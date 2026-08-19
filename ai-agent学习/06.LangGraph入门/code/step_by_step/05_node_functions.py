# -*- coding: utf-8 -*-
"""05. Node：把业务步骤拆成可测试函数

节点函数与业务函数分离：
- 业务函数：不需要知道 LangGraph，方便测试
- 节点函数：接收状态、调用业务函数、返回状态更新

运行方式：
    python step_by_step/05_node_functions.py
    # 或安装 pytest 后：pytest step_by_step/05_node_functions.py

练习任务：
- 为 summarize_documents 写一个纯业务函数，再用节点函数包装它。
- 给每个节点函数写一个最小测试，只验证输入输出结构。
"""

from typing import TypedDict


class ResearchState(TypedDict):
    topic: str
    questions: list[str]


def build_questions(topic: str) -> list[str]:
    return [
        f"{topic} 是什么？",
        f"{topic} 的核心概念有哪些？",
        f"{topic} 适合哪些工程场景？",
    ]


def analyze_topic(state: ResearchState) -> dict[str, list[str]]:
    return {"questions": build_questions(state["topic"])}


def test_build_questions() -> None:
    questions = build_questions("LangGraph")
    assert len(questions) == 3
    assert "LangGraph" in questions[0]


def main() -> None:
    test_build_questions()
    state: ResearchState = {"topic": "LangGraph", "questions": []}
    result = analyze_topic(state)
    print(result)


if __name__ == "__main__":
    main()
