# s02: 工具调用 —— 加一个工具只加一行

> "加一个工具 = 加一行映射" —— 循环完全不变，在分发表里注册新工具就完事了。
> Harness 层：工具分发 —— 扩展模型的能力范围。

---

## 问题引入

s01 的 Agent 只有一个工具：`bash`。读文件要用 `cat path/to/file`，写文件要用 `echo "..." > file.py`，编辑文件要用 `sed`。

模型心里想的是"读这个文件"，但必须拼出 `cat path/to/file` 这个 shell 命令。多了一层翻译，浪费 token 还容易出错。

**类比**：就像你有一个聪明的助手，但它只会用锤子。你让它拧螺丝，它只能用锤子砸。你需要给它一个工具箱——螺丝刀、扳手、钳子，各司其职。

---

## 解决方案

s01 的循环完全保留（LLM 调用、tool_calls 检查、消息追加——一个字不改）。唯一的变化是那一行工具执行：`run_bash()` 硬编码变成了 `TOOL_HANDLERS[name]()` 分发查找。

给 Agent 加一个工具只需要两件事：

1. **定义工具**：在 TOOLS 列表中加一条
2. **注册处理函数**：在 TOOL_HANDLERS 字典中加一行映射

---

## 工作原理

### 从 1 个工具扩展到 5 个工具

s01 只有 bash：

```python
TOOLS = [{"type": "function", "function": {"name": "bash", ...}}]
def run_bash(command): ...
```

s02 扩展到 5 个工具，每个工具独立实现：

```python
TOOLS = [
    {"type": "function", "function": {
        "name": "bash", "description": "执行 shell 命令", ...}},
    {"type": "function", "function": {
        "name": "read_file", "description": "读取文件内容", ...}},
    {"type": "function", "function": {
        "name": "write_file", "description": "写入文件内容", ...}},
    {"type": "function", "function": {
        "name": "edit_file", "description": "替换文件中的文本", ...}},
    {"type": "function", "function": {
        "name": "glob", "description": "按模式查找文件", ...}},
]
```

每个工具有自己的实现函数：

```python
from pathlib import Path

WORKDIR = Path(".").resolve()

def run_read(path: str, limit: int = None) -> str:
    """读取文件内容，可选限制行数。"""
    lines = (WORKDIR / path).read_text().splitlines()
    if limit:
        lines = lines[:limit]
    return "\n".join(lines)

def run_write(path: str, content: str) -> str:
    """将内容写入文件。"""
    (WORKDIR / path).write_text(content)
    return f"已写入 {len(content)} 字节到 {path}"

def run_edit(path: str, old_text: str, new_text: str) -> str:
    """替换文件中的一段文本（只替换第一次出现）。"""
    file_path = WORKDIR / path
    text = file_path.read_text()
    if old_text not in text:
        return "错误：未找到要替换的文本"
    file_path.write_text(text.replace(old_text, new_text, 1))
    return f"已编辑 {path}"

def run_glob(pattern: str) -> str:
    """按 glob 模式查找文件。"""
    import glob as g
    return "\n".join(g.glob(pattern, root_dir=str(WORKDIR)))
```

### 工具分发：一行映射

```python
# 工具分发表：工具名 -> 处理函数
TOOL_HANDLERS = {
    "bash":       run_bash,
    "read_file":  run_read,
    "write_file": run_write,
    "edit_file":  run_edit,
    "glob":       run_glob,
}

# 循环中只有一行变化——从硬编码 run_bash 变成分发查找：
for tool_call in msg.tool_calls:
    handler = TOOL_HANDLERS[tool_call.function.name]  # 查找
    args = json.loads(tool_call.function.arguments)
    output = handler(**args)                           # 调用
    messages.append({"role": "tool", "tool_call_id": tool_call.id, "content": output})
```

**加一个工具 = 在 TOOLS 数组加一条 + 在 TOOL_HANDLERS 字典加一行映射。循环不变。**

### 多次工具调用

模型经常一次返回多个 tool_call——"读 a.py 和 b.py，再列出所有 .py 文件"。

按照模型返回的顺序逐个执行：

```python
# 模型可能同时请求多个工具调用
for tool_call in msg.tool_calls:
    # 按顺序逐个执行
    handler = TOOL_HANDLERS[tool_call.function.name]
    ...
```

---

## 完整代码

```python
import os, json, subprocess
from pathlib import Path
from openai import OpenAI   # DeepSeek 兼容 OpenAI SDK，所以用 openai 包
from dotenv import load_dotenv

# 从 .env 文件加载环境变量
load_dotenv()

# ---- DeepSeek API 客户端初始化 ----
deepseek_client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),   # 从环境变量读取 API Key
    base_url="https://api.deepseek.com",      # DeepSeek API 地址
)
MODEL = os.getenv("MODEL_ID", "deepseek-chat")  # 模型名称，默认 deepseek-chat
WORKDIR = Path(".").resolve()                    # 工作目录：当前目录的绝对路径
SYSTEM = f"你是一个编程助手，工作目录是 {WORKDIR}。使用工具完成任务。"  # 系统提示词

# ---- 5 个工具的定义：告诉模型有哪些工具可用 ----
# 每个工具包含 name（名称）、description（描述）、parameters（参数定义）
TOOLS = [
    {"type": "function", "function": {
        "name": "bash", "description": "执行 shell 命令",
        "parameters": {"type": "object", "properties": {
            "command": {"type": "string", "description": "要执行的命令"}},
            "required": ["command"]}}},
    {"type": "function", "function": {
        "name": "read_file", "description": "读取文件内容",
        "parameters": {"type": "object", "properties": {
            "path": {"type": "string"}, "limit": {"type": "integer"}},
            "required": ["path"]}}},
    {"type": "function", "function": {
        "name": "write_file", "description": "写入文件内容",
        "parameters": {"type": "object", "properties": {
            "path": {"type": "string"}, "content": {"type": "string"}},
            "required": ["path", "content"]}}},
    {"type": "function", "function": {
        "name": "edit_file", "description": "替换文件中的文本",
        "parameters": {"type": "object", "properties": {
            "path": {"type": "string"}, "old_text": {"type": "string"},
            "new_text": {"type": "string"}},
            "required": ["path", "old_text", "new_text"]}}},
    {"type": "function", "function": {
        "name": "glob", "description": "按模式查找文件",
        "parameters": {"type": "object", "properties": {
            "pattern": {"type": "string"}},
            "required": ["pattern"]}}},
]

# ---- 工具实现：每个工具对应一个 Python 函数 ----
def run_bash(command: str) -> str:
    """执行 shell 命令并返回输出。"""
    result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
    return result.stdout or result.stderr or "(无输出)"

def run_read(path: str, limit: int = None) -> str:
    """读取文件内容，可选限制行数。"""
    lines = (WORKDIR / path).read_text().splitlines()
    return "\n".join(lines[:limit] if limit else lines)

def run_write(path: str, content: str) -> str:
    """将内容写入指定文件。"""
    (WORKDIR / path).write_text(content)
    return f"已写入 {len(content)} 字节到 {path}"

def run_edit(path: str, old_text: str, new_text: str) -> str:
    """替换文件中的一段文本（只替换第一次出现）。"""
    file_path = WORKDIR / path
    text = file_path.read_text()
    if old_text not in text:
        return "错误：未找到要替换的文本"
    file_path.write_text(text.replace(old_text, new_text, 1))
    return f"已编辑 {path}"

def run_glob(pattern: str) -> str:
    """按 glob 模式查找文件，返回匹配的文件路径。"""
    import glob as g
    return "\n".join(g.glob(pattern, root_dir=str(WORKDIR)))

# ---- 工具分发表：工具名 -> 处理函数 ----
# 加工具只需在这里加一行映射，循环完全不变
TOOL_HANDLERS = {
    "bash": run_bash, "read_file": run_read, "write_file": run_write,
    "edit_file": run_edit, "glob": run_glob,
}

def agent_loop(messages: list):
    """核心循环：与 s01 完全相同，只是工具分发表更大了。"""
    while True:
        # 把对话历史和工具定义发给 DeepSeek API
        response = deepseek_client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "system", "content": SYSTEM}] + messages,
            tools=TOOLS, max_tokens=4096,
        )
        msg = response.choices[0].message  # 取出模型回复
        messages.append(msg)                # 追加到对话历史
        if not msg.tool_calls:              # 没有工具调用 → 模型说完了
            print(f"\nAgent: {msg.content}")
            return
        # 有工具调用 → 通过分发表查找处理函数，逐个执行
        for tc in msg.tool_calls:
            handler = TOOL_HANDLERS[tc.function.name]  # 工具名 -> 处理函数
            args = json.loads(tc.function.arguments)    # 解析参数
            output = handler(**args)                    # 执行工具
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": output})

if __name__ == "__main__":
    query = input("你 >> ").strip()
    agent_loop([{"role": "user", "content": query}])
```

---

## 动手试一试

1. 输入"读取 README.md 并告诉我这个项目是什么"
2. 输入"创建一个 test.py 文件，然后读回来"
3. 输入"找出当前目录下所有 Python 文件"
4. 输入"同时读取 README.md 和 requirements.txt，然后创建一个总结文件"

**观察重点**：模型什么时候只调用一个工具？什么时候一次调用多个？多个工具调用的执行顺序对吗？

---

## 常见坑

**坑 1：工具参数解析失败**
- 现象：`json.loads(tool_call.function.arguments)` 报错
- 原因：模型返回了格式不正确的 JSON 参数
- 解决：加 try-except 保护，返回错误信息让模型重试

**坑 2：路径安全问题**
- 现象：模型调用 `read_file("../../etc/passwd")` 读取敏感文件
- 原因：没有校验文件路径是否在工作目录内
- 解决：加一个 `safe_path` 检查（下一章 s03 的权限系统会系统解决）

---

## 与上一章的关系

s01 让 Agent 能持续行动。s02 在此基础上**只改了一行代码**（`run_bash()` → `TOOL_HANDLERS[name]()`），就让 Agent 从"只会用锤子"变成"有一个工具箱"。

---

## 下一章预告

Agent 现在有 5 个专用工具。文件工具受路径保护，但 bash 无限制——`rm -rf /` 照样能执行。

**下一章 s03**：在工具执行前加一道门——这个操作安全吗？需要用户审批吗？

---

## 速查表

| 概念 | 一句话解释 |
|------|-----------|
| TOOL_HANDLERS | 工具名到处理函数的字典。加工具 = 加一行映射 |
| 工具定义 (TOOLS) | JSON 格式，告诉模型"我能做什么"和"需要什么参数" |
| 多次工具调用 | 模型可能一次返回多个 tool_call，按顺序逐个执行 |
| 循环不变 | s01 的 while True 循环一字不改，变的只是工具分发 |
