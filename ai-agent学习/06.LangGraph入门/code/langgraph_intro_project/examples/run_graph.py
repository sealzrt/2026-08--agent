# -*- coding: utf-8 -*-
"""本地脚本运行完整图（默认模拟模式）。

运行方式：
    python examples/run_graph.py
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from langgraph.types import Command  # noqa: E402

from app.config import MAX_ITERATIONS, RECURSION_LIMIT  # noqa: E402
from app.graph import GRAPH  # noqa: E402
from app.state import build_initial_state  # noqa: E402


def main() -> None:
    topic = input("请输入研究主题（回车默认 LangGraph）：").strip() or "LangGraph"
    config = {"configurable": {"thread_id": "local-run-001"}}
    state = build_initial_state(topic, MAX_ITERATIONS)

    print(f"\n开始检索与总结：{topic}\n")
    result = GRAPH.invoke(state, config | {"recursion_limit": RECURSION_LIMIT})

    # langgraph 1.x：图被 interrupt 时 invoke 不抛异常，
    # 而是返回带 __interrupt__ 键的状态
    if "__interrupt__" in result:
        print("任务已暂停，等待人工确认。")
        feedback = input("是否批准？(y/n，默认 y)：").strip().lower()
        approved = feedback != "n"
        comment = "" if approved else input("修改意见：").strip()
        result = GRAPH.invoke(
            Command(resume={
                "approved": approved,
                "comment": comment,
                "approved_by": "本地演示",
            }),
            config | {"recursion_limit": RECURSION_LIMIT},
        )

    print("\n=== 最终报告 ===\n")
    print(result["final_report"])
    print(f"\n质量评分：{result['quality_score']}")


if __name__ == "__main__":
    main()
