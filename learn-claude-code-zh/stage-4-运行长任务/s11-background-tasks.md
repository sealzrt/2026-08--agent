# s11: 后台任务 —— 慢操作走后台，Agent 继续思考

> "慢操作走后台，Agent 循环继续" —— 后台线程执行命令，后续轮次收集完成结果。
> Harness 层：后台 —— 异步执行，不阻塞主循环。

---

## 问题引入

读文件或 `git status` 通常很快，同步执行几乎无感。但安装依赖、跑完整测试套件、构建项目可能要几分钟。命令返回前，Harness 无法处理下一个工具调用。

如果后续工作不依赖这个命令的结果，何必等它？比如启动完整测试后，Agent 可以先看文档或整理文件，等测试跑完再看结果。

**类比**：你在做饭。烤箱需要 30 分钟，你不可能站在烤箱前干等。你把东西放进烤箱、设好闹钟，然后去切菜、调酱。闹钟响了再回来检查。后台任务就是 Agent 的"烤箱 + 闹钟"。

---

## 解决方案

本章让慢操作走后台线程。当前工具调用先返回一个占位结果，Agent 循环继续。后续轮次开始时，收集已完成的结果并注入对话。

|  | 同步 (s04) | 后台 (s11) |
|--|-----------|-----------|
| 慢操作 | 当前工具调用阻塞 | 后台线程执行 |
| Agent 循环 | 等命令返回 | 拿到占位结果后继续 |
| 结果 | 命令完成后返回 | 先返回 bg_id，后续轮次收集结果 |

---

## 工作原理

### 显式请求后台执行

模型通过 bash 工具的 `run_in_background` 参数请求后台执行：

```python
def should_run_background(tool_name: str, tool_input: dict) -> bool:
    """只有显式设置 run_in_background=true 的 bash 才走后台。"""
    return tool_name == "bash" and tool_input.get("run_in_background") is True
```

### BackgroundManager：后台执行与生命周期

```python
import threading

class BackgroundManager:
    def __init__(self):
        self.tasks = {}      # bg_id -> 任务信息
        self.results = {}    # bg_id -> 执行结果
        self._ready = []     # 已完成的 bg_id 队列
        self._lock = threading.Lock()

    def start(self, command: str) -> str:
        """启动后台任务，立即返回 bg_id。"""
        bg_id = f"bg_{len(self.tasks):04d}"
        self.tasks[bg_id] = {"command": command, "status": "running"}
        thread = threading.Thread(target=self._run, args=(bg_id, command), daemon=True)
        thread.start()
        return bg_id

    def _run(self, bg_id: str, command: str):
        """后台线程中执行命令。"""
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=300)
        status = "completed" if result.returncode == 0 else "failed"
        with self._lock:
            self.tasks[bg_id]["status"] = status
            self.results[bg_id] = result.stdout or result.stderr
            self._ready.append(bg_id)

    def collect(self) -> list:
        """收集已完成的结果。"""
        with self._lock:
            ready = list(self._ready)
            self._ready.clear()
        notifications = []
        for bg_id in ready:
            notifications.append(
                f"<task_notification> 后台任务 {bg_id} "
                f"[{self.tasks[bg_id]['status']}]:\n"
                f"{self.results[bg_id][:5000]}</task_notification>"
            )
        return notifications

BG = BackgroundManager()
```

### 循环集成

```python
def agent_loop(messages):
    while True:
        # 每轮开始前，收集已完成的后台结果
        notifications = BG.collect()
        for note in notifications:
            messages.append({"role": "user", "content": note})

        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "system", "content": SYSTEM}] + messages,
            tools=TOOLS, max_tokens=4096,
        )
        msg = response.choices[0].message
        messages.append(msg)
        if not msg.tool_calls:
            print(f"\nAgent: {msg.content}"); return

        for tc in msg.tool_calls:
            args = json.loads(tc.function.arguments)
            # 判断是否走后台
            if should_run_background(tc.function.name, args):
                command = args.get("command", "")
                bg_id = BG.start(command)
                output = f"[后台任务 {bg_id} 已启动] 命令: {command}"
            else:
                handler = TOOL_HANDLERS.get(tc.function.name)
                output = handler(**args) if handler else f"未知: {tc.function.name}"
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": output})
```

### 典型流程

```
第 1 轮：
  LLM → bash "npm install" (run_in_background=true)
  → 启动后台任务 bg_0001
  → 工具结果: "[后台任务 bg_0001 已启动]"
  → LLM: "好的，我先看看配置文件。"

第 2 轮：
  LLM → read_file "package.json" (快速，同步)
  → 工具结果: 文件内容

第 3 轮：
  → 收集 bg_0001 结果 → <task_notification>
  → LLM 看到: 配置文件 + 安装完成通知
```

---

## 完整代码（核心片段）

```python
import os, json, subprocess, threading
from pathlib import Path
from openai import OpenAI   # DeepSeek 兼容 OpenAI SDK，所以用 openai 包
from dotenv import load_dotenv

# 从 .env 文件加载环境变量
load_dotenv()

# ---- DeepSeek API 客户端初始化 ----
deepseek_client = OpenAI(api_key=os.getenv("DEEPSEEK_API_KEY"), base_url="https://api.deepseek.com")
MODEL = os.getenv("MODEL_ID", "deepseek-chat")  # 模型名称
WORKDIR = Path(".").resolve()                    # 工作目录的绝对路径
SYSTEM = f"你是编程助手，工作目录 {WORKDIR}。bash 工具支持 run_in_background 参数。"

TOOLS = [
    {"type": "function", "function": {"name": "bash", "description": "执行 shell 命令。设 run_in_background=true 可后台运行。",
        "parameters": {"type": "object", "properties": {
            "command": {"type": "string"}, "run_in_background": {"type": "boolean"}},
            "required": ["command"]}}},
    {"type": "function", "function": {"name": "read_file", "description": "读取文件",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}}},
    {"type": "function", "function": {"name": "write_file", "description": "写入文件",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]}}},
    {"type": "function", "function": {"name": "edit_file", "description": "编辑文件",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}, "old_text": {"type": "string"}, "new_text": {"type": "string"}}, "required": ["path", "old_text", "new_text"]}}},
    {"type": "function", "function": {"name": "glob", "description": "查找文件",
        "parameters": {"type": "object", "properties": {"pattern": {"type": "string"}}, "required": ["pattern"]}}},
]

# ---- 工具实现 ----
def run_bash(c): return subprocess.run(c, shell=True, capture_output=True, text=True, timeout=30).stdout or "(无输出)"
def run_read(p): return (WORKDIR / p).read_text()
def run_write(p, c): (WORKDIR / p).write_text(c); return f"已写入 {len(c)} 字节"
def run_edit(p, o, n):
    f = WORKDIR / p; t = f.read_text()
    if o not in t: return "错误"; f.write_text(t.replace(o, n, 1)); return f"已编辑 {p}"
def run_glob(p):
    import glob as g; return "\n".join(g.glob(p, root_dir=str(WORKDIR)))
# ---- 工具分发表 ----
TOOL_HANDLERS = {"bash": run_bash, "read_file": run_read, "write_file": run_write,
                 "edit_file": run_edit, "glob": run_glob}

# ---- 后台任务管理器（s11 新增）：后台线程执行 + task_notification 注入 ----
class BackgroundManager:
    """后台任务管理器：在后台线程执行慢操作，完成后注入通知。"""
    def __init__(self):
        self.tasks, self.results, self._ready, self._lock = {}, {}, [], threading.Lock()
    def start(self, command):
        bg_id = f"bg_{len(self.tasks):04d}"
        self.tasks[bg_id] = {"command": command, "status": "running"}
        def _run():
            r = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=300)
            with self._lock:
                self.tasks[bg_id]["status"] = "completed" if r.returncode == 0 else "failed"
                self.results[bg_id] = r.stdout or r.stderr
                self._ready.append(bg_id)
        threading.Thread(target=_run, daemon=True).start()
        return bg_id
    def collect(self):
        with self._lock: ready, self._ready = list(self._ready), []
        return [f"<task_notification> {bid} [{self.tasks[bid]['status']}]: {self.results.get(bid,'')[:3000]}</task_notification>" for bid in ready]

BG = BackgroundManager()

def agent_loop(messages):
    """核心循环：每轮先收集后台结果，再调用 API。"""
    while True:
        # ★ s11 新增：收集已完成的后台任务，注入为 user 消息
        for note in BG.collect():
            messages.append({"role": "user", "content": note})
        # 调用 DeepSeek API
        response = deepseek_client.chat.completions.create(
            model=MODEL, messages=[{"role": "system", "content": SYSTEM}] + messages,
            tools=TOOLS, max_tokens=4096)
        msg = response.choices[0].message
        messages.append(msg)
        if not msg.tool_calls:
            print(f"\nAgent: {msg.content}"); return
        for tc in msg.tool_calls:
            args = json.loads(tc.function.arguments)
            if tc.function.name == "bash" and args.get("run_in_background"):
                bg_id = BG.start(args["command"])
                output = f"[后台任务 {bg_id} 已启动]"
            else:
                handler = TOOL_HANDLERS.get(tc.function.name)
                output = handler(**args) if handler else f"未知: {tc.function.name}"
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": output})

if __name__ == "__main__":
    q = input("s11 >> ").strip()
    agent_loop([{"role": "user", "content": q}])
```

---

## 动手试一试

1. 输入"后台运行 `pip list`，同时查找当前目录所有 Python 文件"
2. 输入"后台运行 `sleep 5 && echo done`，然后读 README.md"
3. 观察 `<task_notification>` 何时出现

**观察重点**：后台命令是否真的不阻塞？后续轮次是否收到通知？

---

## 常见坑

**坑 1：后台结果丢失**
- 现象：Agent 退出后后台任务的结果没了
- 原因：后台结果只存在内存中
- 解决：持久化场景需要将结果写入文件

**坑 2：后台任务的交互式审批**
- 现象：后台命令需要 `input()` 确认权限，但没人应答
- 原因：后台线程不应弹出交互式审批
- 解决：后台任务自动拒绝需要审批的操作，或预设策略

---

## 与上一章的关系

s10 给了任务持久化。s11 解决"慢操作不阻塞"——Agent 可以一边等后台结果一边做别的事。

---

## 下一章预告

后台任务解决了"慢操作不阻塞"。但如果想定时执行呢？"每天早上 9 点跑测试"、"每 30 分钟检查服务状态"——这些需要**定时触发**。

**下一章 s12**：定时调度——给 Agent 一个闹钟。

---

## 速查表

| 概念 | 一句话解释 |
|------|-----------|
| run_in_background | bash 工具参数，设为 true 走后台 |
| BackgroundManager | 管理后台任务的生命周期和结果 |
| 占位结果 | 先返回 bg_id，实际结果稍后收集 |
| task_notification | 后台完成结果注入对话的格式 |
