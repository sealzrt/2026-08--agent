# s04: 钩子系统 —— 在循环周围挂钩子，不改循环

> "在循环周围挂钩子，不要改循环" —— 钩子在工具执行前后注入扩展逻辑。
> Harness 层：钩子 —— 不侵入循环的扩展点。

---

## 问题引入

s03 的 Agent 有了权限检查。但每加一个新的检查——"记录每次 bash 调用日志"、"写文件后自动 git add"——都需要修改 `agent_loop` 函数。

循环很快就变成这样：

```python
def agent_loop(messages):
    while True:
        # ... LLM 调用 ...
        for tc in msg.tool_calls:
            log_to_file(tc)           # 加了一行
            check_permission(tc)      # 加了一行
            notify_slack(tc)          # 又加了一行
            output = execute(tc)
            auto_git_add(tc)          # 再加一行
            # ... 循环已经面目全非
```

你想扩展的是 Agent 的**行为**，但你改的是**循环本身**。循环应该是稳定的核心，扩展应该挂在外面。

**类比**：想象一条工厂流水线。主线是固定的——产品进来、加工、出去。你想加质检、加包装、加标签。你不会去改流水线本身，而是在流水线的不同位置**加装检查站**。钩子就是这些检查站。

---

## 解决方案

s03 的循环和权限逻辑完全保留。唯一的改动是把 `check_permission()` 从循环体内部移到一个钩子上。循环不再直接调用任何检查函数，而是调用 `trigger_hooks("PreToolUse", block)`，由注册表决定执行什么。

四个事件，覆盖完整的 Agent 生命周期：

| 事件 | 触发时机 | 典型用途 |
|------|---------|---------|
| `UserPromptSubmit` | 用户输入后、进入 LLM 前 | 输入验证、上下文注入 |
| `PreToolUse` | 工具执行前 | 权限检查、日志记录 |
| `PostToolUse` | 工具执行后 | 副作用（自动 git add 等）、输出检查 |
| `Stop` | 循环即将退出时 | 清理、决定是否继续循环 |

扩展通过 `register_hook()` 添加。循环只调用 `trigger_hooks()`。

---

## 工作原理

### 钩子注册表

```python
# 钩子注册表：事件名 -> 回调函数列表
HOOKS = {
    "UserPromptSubmit": [],
    "PreToolUse": [],
    "PostToolUse": [],
    "Stop": [],
}

def register_hook(event: str, callback):
    """注册一个钩子回调。"""
    HOOKS[event].append(callback)

def trigger_hooks(event: str, *args):
    """触发指定事件的所有钩子。"""
    for callback in HOOKS[event]:
        result = callback(*args)
        if result is not None:   # 返回值 ≠ None → 钩子说"停下"
            return result
    return None
```

**关键规则**：
- `PreToolUse` 返回非 None → 当前工具执行被阻止
- `Stop` 返回非 None → 循环继续（不退出）
- `UserPromptSubmit` 和 `PostToolUse` 的返回值不影响控制流

### UserPromptSubmit：用户输入前注入上下文

```python
def context_inject_hook(query: str) -> str | None:
    """在每次用户输入时注入当前工作目录信息。"""
    print(f"[钩子] UserPromptSubmit: 工作目录 {WORKDIR}")
    return None   # 返回 None = 不修改，让输入通过

register_hook("UserPromptSubmit", context_inject_hook)
```

### PreToolUse + PostToolUse：工具执行前后的钩子

```python
# PreToolUse：权限检查（s03 的逻辑，从循环移到钩子）
def permission_hook(tool_name, args):
    if tool_name == "bash":
        for pattern in DENY_LIST:
            if pattern in args.get("command", ""):
                return f"权限被拒绝：{pattern} 在拒绝清单中"
    if tool_name in ("read_file", "write_file", "edit_file"):
        path = args.get("path", "")
        if not (WORKDIR / path).resolve().is_relative_to(WORKDIR):
            choice = input("   允许？[y/N] ").strip().lower()
            if choice not in ("y", "yes"):
                return "权限被拒绝"
    return None

# PreToolUse：日志记录
def log_hook(tool_name, args):
    print(f"[钩子] 执行 {tool_name}(...)")
    return None  # 日志不阻止执行

# PostToolUse：大输出提醒
def large_output_hook(tool_name, args, output):
    if len(str(output)) > 100000:
        print(f"[钩子] ⚠️ {tool_name} 输出过大")
    return None

register_hook("PreToolUse", permission_hook)
register_hook("PreToolUse", log_hook)
register_hook("PostToolUse", large_output_hook)
```

### Stop：循环退出前的钩子

```python
def summary_hook(messages: list) -> str | None:
    """循环即将退出时，打印一个统计摘要。"""
    tool_count = sum(
        1 for m in messages
        if isinstance(m.get("content"), list)
        for b in m["content"]
        if isinstance(b, dict) and b.get("type") == "tool_use"
    )
    print(f"[钩子] Stop: 本次会话使用了 {tool_count} 次工具调用")
    return None   # 返回 None = 允许退出

register_hook("Stop", summary_hook)
```

### 循环中只有一行变化

```python
# s03 直接在循环中调用 check_permission(block)
# s04 用钩子替代硬编码：

for tc in msg.tool_calls:
    args = json.loads(tc.function.arguments)

    # PreToolUse 钩子（包含权限检查、日志等）
    blocked = trigger_hooks("PreToolUse", tc.function.name, args)
    if blocked:
        messages.append({"role": "tool", "tool_call_id": tc.id,
                         "content": str(blocked)})
        continue

    # 执行工具
    handler = TOOL_HANDLERS.get(tc.function.name)
    output = handler(**args) if handler else f"未知工具: {tc.function.name}"

    # PostToolUse 钩子
    trigger_hooks("PostToolUse", tc.function.name, args, output)

    messages.append({"role": "tool", "tool_call_id": tc.id, "content": output})
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
SYSTEM = f"你是一个编程助手，工作目录是 {WORKDIR}。"

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
]

# ---- 工具实现（同 s03，简写版）----
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

# ---- 工具分发表 ----
TOOL_HANDLERS = {"bash": run_bash, "read_file": run_read, "write_file": run_write,
                 "edit_file": run_edit, "glob": run_glob}

# ---- 钩子系统（s04 新增）----
# 钩子注册表：事件名 -> 回调函数列表
# 四个扩展点：UserPromptSubmit、PreToolUse、PostToolUse、Stop
HOOKS = {"UserPromptSubmit": [], "PreToolUse": [], "PostToolUse": [], "Stop": []}
DENY_LIST = ["rm -rf /", "sudo", "shutdown", "reboot"]  # 拒绝清单

def register_hook(event, callback):
    """注册一个钩子回调到指定事件。"""
    HOOKS[event].append(callback)

def trigger_hooks(event, *args):
    """触发指定事件的所有钩子。返回非 None 表示“操作应停止”。"""
    for cb in HOOKS[event]:
        result = cb(*args)
        if result is not None:  # 第一个返回非 None 的钩子决定结果
            return result
    return None

# ---- 注册各个钩子回调 ----
def permission_hook(tool_name, args):
    """PreToolUse 钩子：检查权限，拒绝危险操作。"""
    if tool_name == "bash":
        for p in DENY_LIST:
            if p in args.get("command", ""):
                return f"⛔ 已阻止：'{p}' 在拒绝清单中"
    if tool_name in ("read_file", "write_file", "edit_file"):
        if not (WORKDIR / args.get("path", "")).resolve().is_relative_to(WORKDIR):
            if input("   工作目录外操作，允许？[y/N] ").strip().lower() not in ("y", "yes"):
                return "权限被拒绝"
    return None  # 返回 None 表示允许继续

def log_hook(tool_name, args):
    """PreToolUse 钩子：记录工具调用日志。"""
    print(f"\033[90m[钩子] {tool_name}(...)\033[0m")
    return None  # 返回 None 表示不阻止

def large_output_hook(tool_name, args, output):
    """PostToolUse 钩子：检查工具输出是否过大。"""
    if len(str(output)) > 100000:
        print(f"\033[90m[钩子] ⚠️ {tool_name} 输出过大\033[0m")
    return None

def summary_hook(messages):
    """Stop 钩子：在退出前打印会话统计。"""
    tool_count = sum(1 for m in messages if isinstance(m.get("content"), list)
                     for b in m["content"] if isinstance(b, dict) and b.get("type") == "tool_use")
    print(f"\033[90m[钩子] Stop: 本次会话 {tool_count} 次工具调用\033[0m")
    return None

# 注册钩子（注意顺序：权限检查最先注册，最先执行）
register_hook("PreToolUse", permission_hook)   # 权限检查
register_hook("PreToolUse", log_hook)          # 日志记录
register_hook("PostToolUse", large_output_hook)  # 输出检查
register_hook("Stop", summary_hook)            # 退出统计

def agent_loop(messages):
    """核心循环：在 s03 基础上，把权限检查改为钩子机制。"""
    while True:
        # 调用 DeepSeek API
        response = deepseek_client.chat.completions.create(
            model=MODEL, messages=[{"role": "system", "content": SYSTEM}] + messages,
            tools=TOOLS, max_tokens=4096)
        msg = response.choices[0].message
        messages.append(msg)
        if not msg.tool_calls:
            # ★ Stop 钩子：退出前检查，如果钩子返回非 None 则继续循环
            force = trigger_hooks("Stop", messages)
            if force:
                messages.append({"role": "user", "content": force}); continue
            print(f"\nAgent: {msg.content}"); return
        for tc in msg.tool_calls:
            args = json.loads(tc.function.arguments)
            # ★ PreToolUse 钩子：执行前检查（权限 + 日志）
            blocked = trigger_hooks("PreToolUse", tc.function.name, args)
            if blocked:
                messages.append({"role": "tool", "tool_call_id": tc.id, "content": str(blocked)}); continue
            # 执行工具
            handler = TOOL_HANDLERS.get(tc.function.name)
            output = handler(**args) if handler else f"未知工具: {tc.function.name}"
            # ★ PostToolUse 钩子：执行后检查（输出过大警告等）
            trigger_hooks("PostToolUse", tc.function.name, args, output)
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": output})

if __name__ == "__main__":
    query = input("s04 >> ").strip()
    trigger_hooks("UserPromptSubmit", query)  # 触发用户输入钩子
    agent_loop([{"role": "user", "content": query}])
```

---

## 动手试一试

1. 输入"读取 README.md"（应该直接通过，观察钩子日志）
2. 输入"创建一个 test.txt"（写文件后观察 PostToolUse 是否触发）
3. 输入"删除 /tmp 下的所有临时文件"（bash + rm 触发权限钩子）

**观察重点**：每次工具执行前是否出现 `[钩子]` 日志？权限被拒绝时，是被钩子拦截的还是循环里硬编码的？

---

## 常见坑

**坑 1：钩子执行顺序依赖**
- 现象：日志钩子在权限钩子前执行，导致被拒绝的操作也记了日志
- 原因：钩子按注册顺序执行
- 解决：注意注册顺序，权限检查应该最先注册

**坑 2：Stop 钩子意外阻止退出**
- 现象：Agent 怎么都停不下来
- 原因：Stop 钩子返回了非 None 值，导致循环继续
- 解决：Stop 钩子只在需要强制继续时返回非 None，否则返回 None

---

## 与上一章的关系

s03 把权限检查硬编码在循环里。s04 把它移到了钩子上——循环不再直接调用 `check_permission()`，而是调用 `trigger_hooks("PreToolUse", ...)`。同样的权限逻辑，但现在**扩展逻辑和核心循环解耦了**。

---

## 下一章预告

Agent 现在能安全地执行操作了。但它有没有在开始工作前想过"先做什么、后做什么"？给它一个复杂任务，它直接上手就干，还是先列个计划？

**下一章 s05**：给 Agent 一个计划工具。先列清单，再执行。

---

## 速查表

| 概念 | 一句话解释 |
|------|-----------|
| HOOKS | 钩子注册表，事件名到回调函数列表的映射 |
| register_hook | 注册一个钩子回调到指定事件 |
| trigger_hooks | 触发指定事件的所有钩子，返回值非 None 表示"停下" |
| PreToolUse | 工具执行前的钩子，可用于权限检查和日志 |
| PostToolUse | 工具执行后的钩子，可用于副作用和输出检查 |
| Stop | 循环退出前的钩子，可阻止退出 |
