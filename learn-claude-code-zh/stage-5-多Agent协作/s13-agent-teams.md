# s13: 智能体团队 —— 太大了就分给队友做

> "一个 Agent 搞不定时，让队友分工做。" —— 持久化队友、共享任务选择、可选工作目录隔离、类型化协议。
> Harness 层：团队 —— 多个 Agent 如何分工、共享状态、保持协调。

---

## 问题引入

假设让一个 Agent 重构整个后端：配置加载、认证、测试。一个 Agent 顺序处理可以，但耗时更长，而且早期细节会逐渐离开上下文。

这是并行工作的好场景，但用户通常描述的是目标而非团队设计："重构这个后端，清理配置、认证和测试，保留接口，确保测试通过。"

**类比**：你是一个项目经理。面对大项目，你不会一个人干所有事——你会组建团队：Alice 负责配置，Bob 负责认证，Charlie 负责测试。每人有自己的工作台（工作目录），通过邮件（消息总线）沟通，看项目看板（任务系统）领活。

---

## 解决方案

s13 在 s10 的基础上，添加了一个 **Lead 管理的团队运行时**：

- **Lead**（主控）拥有用户对话，提出分工方案，等用户确认
- **Teammates**（队友）运行独立的 Agent 循环，在 WORK 和 IDLE 之间切换
- **MessageBus** 通过文件邮箱传递消息、结果和控制事件
- **共享任务看板**让空闲队友找到就绪任务并原子认领
- **可选工作树**将任务绑定到独立的工作目录，避免并行编辑冲突

### s06 子代理 vs s13 队友

|  | s06 子代理 | s13 队友 |
|--|-----------|---------|
| 生命周期 | 一次调用后结束 | WORK → IDLE → WORK 直到关闭 |
| 上下文 | 只为一个任务存在 | 跨任务持久存在 |
| 通信 | 返回一个结果 | 接收消息和发出事件 |
| 协调 | 单向委派 | 与 Lead 双向协作 |

---

## 工作原理

### 1. Lead 提议团队并等待确认

```python
# Lead 的系统提示词包含：
"当并行工作有帮助时，先提议一个小团队和明确的职责，"
"等待用户确认后再调用 spawn_teammate。"
```

Lead 只在第一轮提议分工：

```
我建议三个并行方向：
- config: 清理配置加载
- auth: 重构认证
- tests: 添加回归测试

确认后我会启动队友。
```

### 2. MessageBus：文件邮箱通信

```python
class MessageBus:
    def __init__(self, mail_dir=Path(".mailboxes")):
        self.mail_dir = mail_dir
        self.mail_dir.mkdir(exist_ok=True)

    def send(self, from_agent, to_agent, content, msg_type="message"):
        """发送消息到收件人的邮箱文件。"""
        path = self.mail_dir / f"{to_agent}.jsonl"
        msg = {"from": from_agent, "to": to_agent,
               "content": content, "type": msg_type}
        with path.open("a") as f:
            f.write(json.dumps(msg, ensure_ascii=True) + "\n")

    def read_inbox(self, agent):
        """读取并清空收件箱。"""
        path = self.mail_dir / f"{agent}.jsonl"
        if not path.exists(): return []
        msgs = [json.loads(l) for l in path.read_text().strip().splitlines()]
        path.unlink()  # 读后清空
        return msgs
```

### 3. 结果和 IDLE 是分开的事件

```python
# 队友完成一个任务时，发送两个事件：
bus.send("alice", "lead", "认证已重构，测试通过。", msg_type="result")
bus.send("alice", "lead", "等待更多工作。", msg_type="idle_notification")
```

`result` 回答"这个任务产出了什么？"，`idle_notification` 回答"这个队友还能接活吗？"

### 4. 原子任务认领

多个队友可能同时发现同一个就绪任务，认领必须在锁内完成：

```python
import fcntl

def claim_task(task_id, owner):
    """在文件锁保护下原子认领任务。"""
    lock_file = TASKS_DIR / ".lock"
    with open(lock_file, "w") as lf:
        fcntl.flock(lf, fcntl.LOCK_EX)  # 文件锁
        try:
            task = load_task(task_id)
            if task.status != "pending" or task.owner is not None:
                return "任务不可用"
            task.owner = owner
            task.status = "in_progress"
            save_task(task)
            return f"已认领 {task_id}"
        finally:
            fcntl.flock(lf, fcntl.LOCK_UN)
```

### 5. 关闭协议：类型化控制消息

```python
@dataclass
class ProtocolState:
    request_id: str
    type: str        # shutdown_request / shutdown_response
    sender: str
    target: str
    status: str      # pending / approved

# 关闭流程：
# Lead → shutdown_request(request_id) → 队友收件箱
# 队友完成当前步骤 → shutdown_response(request_id) → Lead
# request_id 匹配请求和响应，status 防止重复应用
```

### 6. 工作树隔离

```python
# Lead 可以为任务绑定独立的工作目录
def create_worktree(name, task_id):
    """创建一个 Git 工作树并绑定到任务。"""
    wt_path = WORKDIR / ".worktrees" / name
    subprocess.run(f"git worktree add {wt_path} -b wt/{name}", shell=True)
    # 绑定到任务
    task = load_task(task_id)
    task.worktree = str(wt_path)
    save_task(task)
    return f"工作树 {name} 已创建并绑定到 {task_id}"
```

队友的文件工具自动使用任务绑定的工作目录：

```python
# 认领任务后，队友的 cwd 切换到任务的工作树
assignment = teammate_assignments.get(owner)
cwd = assignment["cwd"] if assignment else WORKDIR
# 所有文件操作都在 cwd 下进行
```

---

## 完整代码（核心片段）

```python
import os, json, subprocess, threading, time
from pathlib import Path
from dataclasses import dataclass
from openai import OpenAI   # DeepSeek 兼容 OpenAI SDK，所以用 openai 包
from dotenv import load_dotenv

# 从 .env 文件加载环境变量
load_dotenv()

# ---- DeepSeek API 客户端初始化 ----
deepseek_client = OpenAI(api_key=os.getenv("DEEPSEEK_API_KEY"), base_url="https://api.deepseek.com")
MODEL = os.getenv("MODEL_ID", "deepseek-chat")  # 模型名称
WORKDIR = Path(".").resolve()                    # 工作目录的绝对路径
SYSTEM = f"你是 Lead Agent，工作目录 {WORKDIR}。可以提议团队并启动队友。"

# 工具定义（包含团队管理工具：spawn_teammate、list_teammates、send_message、request_shutdown）
TOOLS = [
    {"type": "function", "function": {"name": "bash", "description": "执行命令",
        "parameters": {"type": "object", "properties": {"command": {"type": "string"}}, "required": ["command"]}}},
    {"type": "function", "function": {"name": "read_file", "description": "读取文件",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}}},
    {"type": "function", "function": {"name": "write_file", "description": "写入文件",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]}}},
    {"type": "function", "function": {"name": "create_task", "description": "创建任务",
        "parameters": {"type": "object", "properties": {"subject": {"type": "string"}}, "required": ["subject"]}}},
    {"type": "function", "function": {"name": "spawn_teammate", "description": "启动一个队友 Agent",
        "parameters": {"type": "object", "properties": {
            "name": {"type": "string"}, "task_id": {"type": "string"},
            "instructions": {"type": "string"}},
            "required": ["name", "instructions"]}}},
    {"type": "function", "function": {"name": "list_teammates", "description": "列出队友",
        "parameters": {"type": "object", "properties": {}}}},
    {"type": "function", "function": {"name": "send_message", "description": "给队友发消息",
        "parameters": {"type": "object", "properties": {
            "to": {"type": "string"}, "content": {"type": "string"}},
            "required": ["to", "content"]}}},
    {"type": "function", "function": {"name": "request_shutdown", "description": "请求队友关闭",
        "parameters": {"type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"]}}},
]

# ---- 工具实现 ----
def run_bash(c): return subprocess.run(c, shell=True, capture_output=True, text=True, timeout=30).stdout or "(无输出)"
def run_read(p): return (WORKDIR / p).read_text()
def run_write(p, c): (WORKDIR / p).write_text(c); return f"已写入 {len(c)} 字节"

# ---- 消息总线（队友之间通过文件传递消息）----
MAILBOX_DIR = Path(".mailboxes"); MAILBOX_DIR.mkdir(exist_ok=True)
def send_message(to, content):
    path = MAILBOX_DIR / f"{to}.jsonl"
    with path.open("a") as f:
        f.write(json.dumps({"from": "lead", "to": to, "content": content}) + "\n")
    return f"消息已发送给 {to}"

# ---- 队友运行时（s13 新增）：Lead/Teammate + MessageBus + 原子认领 + 工作树隔离 ----
teammates = {}  # 队友状态字典
def spawn_teammate(name, instructions, task_id=None):
    """启动一个队友 Agent 线程。"""
    def teammate_loop():
        # 队友有自己独立的 messages[]，不与 Lead 共享
        msgs = [{"role": "user", "content": instructions}]
        for _ in range(50):  # 最多 50 轮
            r = deepseek_client.chat.completions.create(
                model=MODEL, messages=[{"role": "system",
                    "content": f"你是队友 {name}。完成分配的任务。"}] + msgs,
                tools=TOOLS[:3], max_tokens=4096)  # 只有基础工具
            m = r.choices[0].message; msgs.append(m)
            if not m.tool_calls:
                send_message("lead", m.content)  # 结果返回 Lead
                teammates[name] = {"status": "idle"}
                return
            for tc in m.tool_calls:
                args = json.loads(tc.function.arguments)
                h = {"bash": run_bash, "read_file": run_read, "write_file": run_write}
                out = h.get(tc.function.name, lambda **k: "未知")(**args)
                msgs.append({"role": "tool", "tool_call_id": tc.id, "content": out})
    teammates[name] = {"status": "working"}
    threading.Thread(target=teammate_loop, daemon=True).start()
    return f"队友 {name} 已启动"

def list_teammates():
    return "\n".join(f"  {n}: {i['status']}" for n, i in teammates.items()) or "无队友"

def request_shutdown(name):
    send_message(name, "请完成当前步骤后关闭。")
    return f"关闭请求已发送给 {name}"

TOOL_HANDLERS = {"bash": run_bash, "read_file": run_read, "write_file": run_write,
                 "spawn_teammate": spawn_teammate, "list_teammates": list_teammates,
                 "send_message": send_message, "request_shutdown": request_shutdown}
# create_task 等同 s10

def agent_loop(messages):
    """Lead Agent 循环：每轮先检查队友消息，再调用 API。"""
    while True:
        # ★ s13 新增：检查收件箱，注入队友发来的消息
        inbox_path = MAILBOX_DIR / "lead.jsonl"
        if inbox_path.exists():
            for line in inbox_path.read_text().strip().splitlines():
                msg = json.loads(line)
                messages.append({"role": "user", "content": f"[队友 {msg['from']}]: {msg['content']}"})
            inbox_path.unlink()

        # 调用 DeepSeek API
        response = deepseek_client.chat.completions.create(
            model=MODEL, messages=[{"role": "system", "content": SYSTEM}] + messages,
            tools=TOOLS, max_tokens=4096)
        msg = response.choices[0].message; messages.append(msg)
        if not msg.tool_calls:
            print(f"\nAgent: {msg.content}"); return
        for tc in msg.tool_calls:
            args = json.loads(tc.function.arguments)
            output = TOOL_HANDLERS.get(tc.function.name, lambda **k: "未知")(**args)
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": output})

if __name__ == "__main__":
    q = input("s13 >> ").strip()
    agent_loop([{"role": "user", "content": q}])
```

---

## 动手试一试

1. 输入"把后端重构放到共享任务看板，配置、认证和测试尽可能并行。认证用工作树隔离。"
2. Lead 提议团队后，输入"开始吧"
3. 观察 `.tasks/` 状态变化、`.mailboxes/` 消息传递、`.worktrees/` 出现

---

## 常见坑

**坑 1：两个队友同时认领同一个任务**
- 现象：任务被两个人同时修改
- 原因：认领没有原子性保护
- 解决：用文件锁保护 claim_task

**坑 2：队友的工具需要交互式审批**
- 现象：后台线程弹出 input() 没人应答
- 原因：队友在后台运行，不应弹交互
- 解决：队友的工具自动拒绝需审批的操作，交给 Lead 处理

---

## 与上一章的关系

s12 解决了"什么时候做"。s13 解决"谁来做"——多个 Agent 并行协作，分工完成复杂任务。

---

## 下一章预告

Lead 和队友只能调用在 code.py 中定义的工具。接入 Jira、部署平台或知识库还需要为每个外部系统单独写工具定义。

**下一章 s07/s14**：技能加载（按需注入知识）和 MCP 插件（连接外部工具），扩展 Agent 的能力边界。

---

## 速查表

| 概念 | 一句话解释 |
|------|-----------|
| Lead | 主控 Agent，拥有用户对话，管理团队 |
| Teammate | 持久化队友，WORK/IDLE 循环 |
| MessageBus | 文件邮箱，每个 Agent 一个 .jsonl 收件箱 |
| 原子认领 | 文件锁保护，多人发现同一任务只有一人认领成功 |
| 工作树 | Git 工作树，为任务绑定独立工作目录 |
| 关闭协议 | 类型化消息 + request_id 关联，有序关闭 |
