# s05: 任务清单 —— 没有计划的智能体会迷失方向

> "没有计划的智能体随风飘荡" —— 先列步骤，再执行。复杂任务不容易漏步骤。
> Harness 层：规划 —— 让 Agent 在行动前思考。

---

## 问题引入

给 Agent 一个复杂任务："把所有 Python 文件改成 snake_case 命名，跑测试，修复失败。"

Agent 开始工作，改了 3 个文件，跑了一个测试，发现 2 个失败，开始修复。修着修着，它忘了最初的目标是"改成 snake_case"——测试失败占据了它全部的注意力。

对话越长越糟糕：工具结果不断填满上下文，冲淡了系统提示词的影响力。10 步的重构：第 1-3 步之后，Agent 就开始即兴发挥了，因为第 4-10 步已经被挤出了它的注意力。

**类比**：想象你让一个新员工完成三件事。如果他不列清单，做完第一件就忘了第二件。但如果他先把三件事写在纸上，做完一件勾一件，就不容易遗漏。

---

## 解决方案

s05 保留了 s04 的工具分发、权限和钩子，然后添加了一个新工具 `todo_write` 和一个提醒计数器。`todo_write` 只更新计划状态；真正干活的还是原有工具。

典型流程：收到任务 → 先调 `todo_write` 列出所有步骤（全部 pending）→ 选一步设为 `in_progress` → 完成它设为 `completed` → 看下一个 pending → 继续。

**关键理解**：`todo_write` 没有给 Agent 增加任何执行能力。它增加的是**规划能力**。

---

## 工作原理

### TodoManager：内存中的任务清单

```python
class TodoManager:
    def __init__(self):
        self.items = []

    def update(self, todos: list) -> str:
        """替换当前任务清单。每项需要 content 和 status。"""
        validated = []
        for item in todos:
            validated.append({
                "content": item.get("content", ""),
                "status": item.get("status", "pending"),  # pending | in_progress | completed
            })
        self.items = validated
        return self.render()

    def render(self) -> str:
        """渲染任务清单为可读文本。"""
        lines = []
        for item in self.items:
            icon = {"pending": "[ ]", "in_progress": "[>]", "completed": "[x]"}.get(item["status"], "[ ]")
            lines.append(f"  {icon} {item['content']}")
        return "\n".join(lines)

TODO = TodoManager()

def run_todo_write(todos: list) -> str:
    """工具处理函数：更新任务清单。"""
    output = TODO.update(todos)
    print(output)
    return output
```

### 工具定义和注册

```python
# 在 TOOLS 列表中新增一条
TODO_TOOL = {
    "type": "function",
    "function": {
        "name": "todo_write",
        "description": "创建和管理任务清单，帮助你先计划再执行。",
        "parameters": {
            "type": "object",
            "properties": {
                "todos": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "content": {"type": "string", "description": "任务描述"},
                            "status": {"type": "string", "enum": ["pending", "in_progress", "completed"]},
                        },
                    },
                },
            },
            "required": ["todos"],
        },
    },
}

# 注册到分发表
TOOL_HANDLERS["todo_write"] = run_todo_write
```

### 提醒计数器

连续 3 轮工具调用都没有使用 `todo_write`，系统会注入一个提醒：

```python
rounds_since_todo = 0

# 在每轮工具执行后检查
used_todo = any(tc.function.name == "todo_write" for tc in msg.tool_calls)
rounds_since_todo = 0 if used_todo else rounds_since_todo + 1

if rounds_since_todo >= 3:
    # 在工具结果中追加提醒
    messages.append({"role": "user", "content": "<提醒>请更新你的任务清单。</提醒>"})
    rounds_since_todo = 0
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
MODEL = os.getenv("MODEL_ID", "deepseek-chat")  # 模型名称
WORKDIR = Path(".").resolve()                    # 工作目录的绝对路径
SYSTEM = (
    f"你是一个编程助手，工作目录是 {WORKDIR}。"
    "对于复杂任务，先使用 todo_write 列出步骤，再逐步执行。"  # 强调先计划再执行
)

# ---- 5 个基础工具 + 1 个计划工具（s05 新增 todo_write）----
TOOLS = [
    {"type": "function", "function": {"name": "bash", "description": "执行 shell 命令",
        "parameters": {"type": "object", "properties": {"command": {"type": "string"}}, "required": ["command"]}}},
    {"type": "function", "function": {"name": "read_file", "description": "读取文件",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}}},
    {"type": "function", "function": {"name": "write_file", "description": "写入文件",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]}}},
    {"type": "function", "function": {"name": "edit_file", "description": "编辑文件",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}, "old_text": {"type": "string"}, "new_text": {"type": "string"}}, "required": ["path", "old_text", "new_text"]}}},
    {"type": "function", "function": {"name": "glob", "description": "查找文件",
        "parameters": {"type": "object", "properties": {"pattern": {"type": "string"}}, "required": ["pattern"]}}},
    {"type": "function", "function": {"name": "todo_write", "description": "创建和管理任务清单",
        "parameters": {"type": "object", "properties": {
            "todos": {"type": "array", "items": {"type": "object", "properties": {
                "content": {"type": "string"}, "status": {"type": "string", "enum": ["pending", "in_progress", "completed"]}}}}},
            "required": ["todos"]}}},
]

# ---- 工具实现（同 s04）----
def run_bash(command): return subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30).stdout or "(无输出)"
def run_read(path): return (WORKDIR / path).read_text()
def run_write(path, content):
    (WORKDIR / path).write_text(content); return f"已写入 {len(content)} 字节"
def run_edit(path, old_text, new_text):
    p = WORKDIR / path; t = p.read_text()
    if old_text not in t: return "错误：未找到文本"
    p.write_text(t.replace(old_text, new_text, 1)); return f"已编辑 {path}"
def run_glob(pattern):
    import glob as g; return "\n".join(g.glob(pattern, root_dir=str(WORKDIR)))

# ---- TodoManager（s05 新增）：内存中的任务清单管理器 ----
class TodoManager:
    """管理任务清单，支持 pending/in_progress/completed 三种状态。"""
    def __init__(self): self.items = []  # 任务列表
    def update(self, todos):
        """更新任务清单，返回渲染后的文本。"""
        self.items = [{"content": i.get("content",""), "status": i.get("status","pending")} for i in todos]
        return self.render()
    def render(self):
        """渲染任务清单为可读文本。"""
        icons = {"pending": "[ ]", "in_progress": "[>]", "completed": "[x]"}  # 状态图标
        return "\n".join(f"  {icons.get(i['status'],'[ ]')} {i['content']}" for i in self.items)

TODO = TodoManager()  # 全局任务清单实例
def run_todo_write(todos):
    """todo_write 工具的处理函数：更新清单并打印。"""
    output = TODO.update(todos); print(output); return output

# ---- 工具分发表（新增 todo_write）----
TOOL_HANDLERS = {"bash": run_bash, "read_file": run_read, "write_file": run_write,
                 "edit_file": run_edit, "glob": run_glob, "todo_write": run_todo_write}

# ---- 钩子系统（s04 保留）----
HOOKS = {"PreToolUse": [], "PostToolUse": [], "Stop": []}
DENY_LIST = ["rm -rf /", "sudo", "shutdown"]
def register_hook(e, cb): HOOKS[e].append(cb)
def trigger_hooks(e, *a):
    for cb in HOOKS[e]:
        r = cb(*a)
        if r is not None: return r
    return None

def permission_hook(name, args):
    """PreToolUse 钩子：检查拒绝清单。"""
    if name == "bash":
        for p in DENY_LIST:
            if p in args.get("command",""): return f"⛔ {p} 在拒绝清单中"
    return None
register_hook("PreToolUse", permission_hook)

def agent_loop(messages):
    """核心循环：新增提醒计数器，连续 3 轮不用 todo_write 就提醒。"""
    rounds_since_todo = 0  # 距离上次使用 todo_write 的轮数
    while True:
        # 调用 DeepSeek API
        response = deepseek_client.chat.completions.create(
            model=MODEL, messages=[{"role": "system", "content": SYSTEM}] + messages,
            tools=TOOLS, max_tokens=4096)
        msg = response.choices[0].message
        messages.append(msg)
        if not msg.tool_calls:
            print(f"\nAgent: {msg.content}"); return
        # 检查本轮是否使用了 todo_write
        used_todo = any(tc.function.name == "todo_write" for tc in msg.tool_calls)
        rounds_since_todo = 0 if used_todo else rounds_since_todo + 1  # 用了就重置，没用就 +1
        for tc in msg.tool_calls:
            args = json.loads(tc.function.arguments)
            blocked = trigger_hooks("PreToolUse", tc.function.name, args)  # 权限检查
            if blocked:
                messages.append({"role": "tool", "tool_call_id": tc.id, "content": str(blocked)}); continue
            output = TOOL_HANDLERS[tc.function.name](**args)
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": output})
        # ★ s05 新增：连续 3 轮没用 todo_write，注入提醒让模型更新清单
        if rounds_since_todo >= 3:
            messages.append({"role": "user", "content": "<提醒>请更新你的任务清单。</提醒>"})
            rounds_since_todo = 0

if __name__ == "__main__":
    query = input("s05 >> ").strip()
    agent_loop([{"role": "user", "content": query}])
```

---

## 动手试一试

1. 输入"重构 example/hello.py：加类型注解、加文档字符串、加 main guard"（应该先列 3 步再执行）
2. 输入"创建一个 Python 包 demo_pkg，含 __init__.py、utils.py 和测试文件"
3. 输入"审查当前目录下的 Python 文件并修复风格问题"

**观察重点**：第一个工具调用是 `todo_write` 吗？列了几步？状态有没有从 pending → in_progress → completed 变化？

---

## 常见坑

**坑 1：Agent 跳过计划直接开干**
- 现象：收到复杂任务后直接调用 bash，没有先列清单
- 原因：系统提示词中没有强调"先计划"
- 解决：在 SYSTEM 中明确写"对于复杂任务，先使用 todo_write 列出步骤"

**坑 2：任务清单太长**
- 现象：列了 50 个步骤，结果 Agent 迷失在清单里
- 原因：没有约束任务数量
- 解决：限制每次 update 最多 20 项

---

## 与上一章的关系

s04 让 Agent 能安全、可扩展地执行操作。s05 在此基础上加了**规划能力**——让 Agent 在动手前先想想该做什么。

---

## 下一章预告

Agent 现在能列计划了。但如果任务太大——"重构整个认证模块"——光一个 TODO 清单不够。这个任务本身就是几十个子任务的集合，会把单次对话的上下文淹没。

**下一章 s06**：把大任务拆给子代理。每个子代理有自己干净的上下文，互不污染。

---

## 速查表

| 概念 | 一句话解释 |
|------|-----------|
| todo_write | 计划工具，更新内存中的任务清单 |
| TodoManager | 管理清单状态，支持 pending/in_progress/completed |
| 提醒计数器 | 连续 3 轮不用 todo_write 就注入提醒 |
| 规划能力 | todo_write 不增加执行能力，只增加规划能力 |
