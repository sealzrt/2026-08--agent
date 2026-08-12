# 第 4 章：接入 Tool Registry

## 学习目标

完成本章后，你应该能够：

- 说明 Tool Registry 的作用
- 设计工具的输入输出协议
- 注册 `calculator` 和 `text_search` 两个基础工具
- 理解工具失败时为什么需要结构化错误

## 核心概念

### Tool

Tool 是 Agent 可以调用的外部能力，例如计算器、文本检索、文件读取或 API 查询。

### Tool Registry

Tool Registry 是工具注册表。它负责保存工具名称和工具实现，让 Agent Runner 可以通过名称查找并调用工具。

### 工具调用记录

每次工具调用都应该记录输入、输出和错误。后续 Trace 会把这些记录保存下来，方便定位问题。

## 工具协议

第一版工具协议建议统一为：

```json
{
  "name": "calculator",
  "input": {"expression": "1 + 2"},
  "output": {"result": 3},
  "error": null
}
```

失败时：

```json
{
  "name": "calculator",
  "input": {"expression": "1 / 0"},
  "output": null,
  "error": "division by zero"
}
```

## 操作步骤

本章对应文件：

```text
agent-harness-demo/src/tool_registry.py
agent-harness-demo/tests/test_tool_registry.py
```

### 步骤 1：定义工具注册表

Tool Registry 至少需要支持：

- 注册工具
- 按名称查找工具
- 执行工具
- 处理未知工具

创建文件：

```text
agent-harness-demo/src/tool_registry.py
```

写入代码：

```python
from collections.abc import Callable
from typing import Any


class ToolRegistry:
    def __init__(self) -> None:
        self.tools: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {}

    def register(self, name: str, func: Callable[[dict[str, Any]], dict[str, Any]]) -> None:
        self.tools[name] = func

    def run(self, name: str, input_data: dict[str, Any]) -> dict[str, Any]:
        if name not in self.tools:
            return {
                "name": name,
                "input": input_data,
                "output": None,
                "error": f"unknown tool: {name}",
            }
        try:
            output = self.tools[name](input_data)
            return {
                "name": name,
                "input": input_data,
                "output": output,
                "error": None,
            }
        except Exception as exc:
            return {
                "name": name,
                "input": input_data,
                "output": None,
                "error": str(exc),
            }


def calculator(input_data: dict[str, Any]) -> dict[str, Any]:
    left = input_data["left"]
    operator = input_data["operator"]
    right = input_data["right"]

    if operator == "+":
        return {"result": left + right}
    if operator == "-":
        return {"result": left - right}
    if operator == "*":
        return {"result": left * right}
    if operator == "/":
        return {"result": left / right}

    raise ValueError(f"unsupported operator: {operator}")


def text_search(input_data: dict[str, Any]) -> dict[str, Any]:
    text = input_data["text"]
    keyword = input_data["keyword"]

    if not text:
        raise ValueError("text cannot be empty")

    return {
        "found": keyword in text,
        "keyword": keyword,
    }


def build_default_registry() -> ToolRegistry:
    registry = ToolRegistry()
    registry.register("calculator", calculator)
    registry.register("text_search", text_search)
    return registry
```

### 步骤 2：注册 calculator 工具

`calculator` 用于演示工具调用，不建议在入门版本中执行任意复杂表达式。

示例输入：

```json
{"left": 1, "operator": "+", "right": 2}
```

示例输出：

```json
{"result": 3}
```

### 步骤 3：注册 text_search 工具

`text_search` 用于演示简单文本检索。

示例输入：

```json
{
  "text": "Trace 能记录工具调用和错误信息。",
  "keyword": "错误"
}
```

示例输出：

```json
{
  "found": true,
  "keyword": "错误"
}
```

### 步骤 4：让 Agent Runner 保存工具调用

Agent Runner 调用工具后，要把工具调用结果放入 `tool_calls`：

```json
{
  "task_id": "task-002",
  "status": "success",
  "answer": "关键词包括 Trace、Evaluator、Report。",
  "tool_calls": [
    {
      "name": "text_search",
      "input": {"text": "Trace 能记录工具调用和错误信息。", "keyword": "错误"},
      "output": {"found": true, "keyword": "错误"},
      "error": null
    }
  ],
  "error": null
}
```

### 步骤 5：添加 Tool Registry 测试

创建文件：

```text
agent-harness-demo/tests/test_tool_registry.py
```

写入测试：

```python
from src.tool_registry import build_default_registry


def test_calculator_tool_returns_result():
    registry = build_default_registry()

    result = registry.run("calculator", {"left": 1, "operator": "+", "right": 2})

    assert result["output"] == {"result": 3}
    assert result["error"] is None


def test_text_search_tool_returns_found():
    registry = build_default_registry()

    result = registry.run("text_search", {"text": "Trace 记录错误信息。", "keyword": "错误"})

    assert result["output"] == {"found": True, "keyword": "错误"}
    assert result["error"] is None


def test_unknown_tool_returns_error():
    registry = build_default_registry()

    result = registry.run("missing_tool", {})

    assert result["output"] is None
    assert result["error"] == "unknown tool: missing_tool"
```

运行本章测试：

```bash
cd harness-tutorial/agent-harness-demo
python -m pytest tests/test_tool_registry.py
```

## 示例

工具失败时不要直接中断整个批次。应该记录失败并继续处理后续任务。

```json
{
  "name": "text_search",
  "input": {"text": "", "keyword": "Trace"},
  "output": null,
  "error": "text cannot be empty"
}
```

这样 Report 可以展示失败原因，而不是只显示程序崩溃。

## 检查点

- [ ] 能说明 Tool Registry 的职责
- [ ] 已定义统一工具调用结构
- [ ] 已设计 `calculator` 工具
- [ ] 已设计 `text_search` 工具
- [ ] 工具失败时能返回结构化错误
- [ ] Agent Runner 能把工具调用写入 `tool_calls`
- [ ] `tests/test_tool_registry.py` 可以通过
