from __future__ import annotations

import ast
import operator
import re
from dataclasses import dataclass
from typing import Callable


@dataclass(frozen=True)
class Tool:
    name: str
    description: str
    run: Callable[[str], str]


@dataclass(frozen=True)
class AgentResponse:
    user_input: str
    thought: str
    tool_name: str
    tool_result: str
    final_answer: str


class MinimalAgent:
    """A tiny local agent: choose a tool, run it, then summarize."""

    def __init__(self, tools: list[Tool]):
        self.tools = {tool.name: tool for tool in tools}

    def run(self, user_input: str) -> AgentResponse:
        tool_name = self._choose_tool(user_input)
        tool = self.tools[tool_name]
        tool_result = tool.run(user_input)
        thought = f"用户输入匹配到 {tool.name} 工具：{tool.description}"
        final_answer = self._summarize(tool_name, tool_result)

        return AgentResponse(
            user_input=user_input,
            thought=thought,
            tool_name=tool_name,
            tool_result=tool_result,
            final_answer=final_answer,
        )

    def _choose_tool(self, user_input: str) -> str:
        if re.search(r"\d+\s*[\+\-\*/]\s*\d+", user_input):
            return "calculator"

        project_keywords = ["项目", "总集", "管理", "范围", "进度", "风险"]
        if any(keyword in user_input for keyword in project_keywords):
            return "project_lookup"

        return "project_lookup"

    def _summarize(self, tool_name: str, tool_result: str) -> str:
        if tool_name == "calculator":
            return f"计算结果是 {tool_result}。"

        return f"根据本地项目知识，建议关注：{tool_result}"


def build_tools() -> list[Tool]:
    return [
        Tool(
            name="calculator",
            description="提取并计算用户输入中的四则运算表达式",
            run=calculator,
        ),
        Tool(
            name="project_lookup",
            description="返回总集项目管理的本地知识片段",
            run=project_lookup,
        ),
    ]


def calculator(user_input: str) -> str:
    expression_match = re.search(r"[\d\s\+\-\*/\(\)\.]+", user_input)
    if expression_match is None:
        return "未找到可计算的表达式"

    expression = expression_match.group(0).strip()
    value = _safe_eval(expression)
    if int(value) == value:
        return str(int(value))
    return str(value)


def _safe_eval(expression: str) -> float:
    operators = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.USub: operator.neg,
    }

    def walk(node: ast.AST) -> float:
        if isinstance(node, ast.Expression):
            return walk(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return float(node.value)
        if isinstance(node, ast.BinOp) and type(node.op) in operators:
            return operators[type(node.op)](walk(node.left), walk(node.right))
        if isinstance(node, ast.UnaryOp) and type(node.op) in operators:
            return operators[type(node.op)](walk(node.operand))
        raise ValueError("表达式只支持数字、括号和 + - * / 运算")

    parsed = ast.parse(expression, mode="eval")
    return walk(parsed)


def project_lookup(_: str) -> str:
    return "范围确认、分工界面、进度跟踪、风险登记和交付物归档。"


def main() -> None:
    agent = MinimalAgent(build_tools())
    examples = [
        "请帮我计算 18 + 24",
        "这个总集项目的核心管理动作是什么？",
    ]

    for user_input in examples:
        response = agent.run(user_input)
        print(f"用户：{response.user_input}")
        print(f"思考：{response.thought}")
        print(f"工具：{response.tool_name}")
        print(f"结果：{response.tool_result}")
        print(f"回答：{response.final_answer}")
        print()


if __name__ == "__main__":
    main()
