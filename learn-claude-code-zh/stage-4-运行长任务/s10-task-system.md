# s10: 任务系统 —— 大目标拆成小任务，持久化到磁盘

> "大目标拆成小任务，排序，持久化到磁盘" —— 文件级任务图，多 Agent 协作的基础。
> Harness 层：任务 —— 持久化的目标，可恢复的进度。

---

## 问题引入

s05 的 TodoWrite 让 Agent 能在当前任务中记录步骤。但当项目拆成三个任务——建数据库表、写 API、加测试——Harness 还需要知道它们之间的关系：API 要等数据库表，测试要等 API。

TodoWrite 不记录依赖关系和负责人。它能显示"写 API"未完成，但 Harness 无法据此判断任务是否可以开始。

**类比**：TodoWrite 是你桌上的便签条——随手记几步。任务系统是**项目看板**——每张卡片有状态（待办/进行中/完成）、依赖关系（A 完成后 B 才能开始）和负责人。而且看板贴在墙上，即使你离开办公室再回来，进度还在。

---

## TodoWrite vs 任务系统

|  | TodoWrite (s05) | 任务系统 (s10) |
|--|-----------------|----------------|
| 角色 | 当前任务的执行清单 | 可恢复的任务系统 |
| 存储 | 内存 / 会话状态 | `.tasks/{id}.json` |
| 依赖 | 无 | `blockedBy` 依赖图 |
| 生命周期 | 当前会话 | 跨会话 |
| 协调 | 无 | owner / claim |
| 粒度 | Agent 自己的步骤 | 可认领、可追踪、可解锁的任务 |

---

## 工作原理

### 数据结构：每个任务一个 JSON 文件

```python
from dataclasses import dataclass, asdict

@dataclass
class Task:
    id: str              # task_ + 8位随机hex
    subject: str         # 任务标题
    description: str     # 任务描述
    status: str          # pending | in_progress | completed
    owner: str | None    # 负责此任务的 Agent
    blockedBy: list      # 依赖的任务 ID 列表
```

### 状态机：两个动作，三种状态

```
pending ──claim──→ in_progress ──complete──→ completed
```

```python
def claim_task(task_id: str, owner: str = "agent") -> str:
    """认领任务：pending → in_progress。"""
    task = load_task(task_id)
    if task.status != "pending":
        return f"任务 {task_id} 状态为 {task.status}，无法认领"
    # 检查依赖
    deps = incomplete_dependencies(task)
    if deps:
        return f"被阻塞，等待: {deps}"
    task.owner = owner
    task.status = "in_progress"
    save_task(task)
    return f"已认领 {task_id} ({task.subject})"

def complete_task(task_id: str, owner: str = "agent") -> str:
    """完成任务：in_progress → completed，并解锁下游任务。"""
    task = load_task(task_id)
    if task.status != "in_progress":
        return f"任务 {task_id} 状态为 {task.status}，无法完成"
    if task.owner != owner:
        return f"任务 {task_id} 归 {task.owner} 所有"
    task.status = "completed"
    save_task(task)
    # 扫描哪些任务被解锁了
    unblocked = [t.subject for t in list_tasks()
                 if t.status == "pending" and can_start(t.id)]
    msg = f"已完成 {task_id}"
    if unblocked:
        msg += f"\n解锁: {', '.join(unblocked)}"
    return msg
```

### 依赖检查

```python
def can_start(task_id: str) -> bool:
    """所有依赖都完成了，任务才能开始。"""
    task = load_task(task_id)
    return not incomplete_dependencies(task)

def incomplete_dependencies(task: Task) -> list:
    """返回未完成的依赖任务 ID。"""
    return [dep_id for dep_id in task.blockedBy
            if not (load_task_safe(dep_id) and
                    load_task_safe(dep_id).status == "completed")]
```

### 组合使用

```python
# 创建带依赖的任务
schema = create_task("建数据库表")
endpoints = create_task("创建 API 端点", blockedBy=[schema.id])
tests = create_task("写测试", blockedBy=[endpoints.id])
docs = create_task("写文档", blockedBy=[schema.id])

# Agent 认领第一个可用任务
claim_task(schema.id)       # ✓ 无依赖，可以开始
complete_task(schema.id)    # ✓ 完成 → 解锁 endpoints 和 docs

claim_task(endpoints.id)    # ✓ schema 已完成
complete_task(endpoints.id) # ✓ 完成 → 解锁 tests

claim_task(docs.id)         # ✓ schema 已完成
complete_task(docs.id)      # ✓ 完成

claim_task(tests.id)        # ✓ endpoints 已完成
complete_task(tests.id)     # ✓ 完成
```

---

## 完整代码（核心片段）

```python
import os, json, subprocess, secrets
from pathlib import Path
from dataclasses import dataclass, asdict
from openai import OpenAI   # DeepSeek 兼容 OpenAI SDK，所以用 openai 包
from dotenv import load_dotenv

# 从 .env 文件加载环境变量
load_dotenv()

# ---- DeepSeek API 客户端初始化 ----
deepseek_client = OpenAI(api_key=os.getenv("DEEPSEEK_API_KEY"), base_url="https://api.deepseek.com")
MODEL = os.getenv("MODEL_ID", "deepseek-chat")  # 模型名称
WORKDIR = Path(".").resolve()                    # 工作目录的绝对路径
TASKS_DIR = WORKDIR / ".tasks"                   # 任务持久化存储目录
TASKS_DIR.mkdir(exist_ok=True)

SYSTEM = f"你是编程助手，工作目录 {WORKDIR}。可以用任务工具管理持久化任务。"

# ---- 工具定义（3 基础 + 4 个任务管理工具）----
TOOLS = [
    {"type": "function", "function": {"name": "bash", "description": "执行命令",
        "parameters": {"type": "object", "properties": {"command": {"type": "string"}}, "required": ["command"]}}},
    {"type": "function", "function": {"name": "read_file", "description": "读取文件",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}}},
    {"type": "function", "function": {"name": "write_file", "description": "写入文件",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]}}},
    {"type": "function", "function": {"name": "create_task", "description": "创建持久化任务",
        "parameters": {"type": "object", "properties": {
            "subject": {"type": "string"}, "description": {"type": "string"},
            "blockedBy": {"type": "array", "items": {"type": "string"}}},
            "required": ["subject"]}}},
    {"type": "function", "function": {"name": "list_tasks", "description": "列出所有任务",
        "parameters": {"type": "object", "properties": {}}}},
    {"type": "function", "function": {"name": "claim_task", "description": "认领任务",
        "parameters": {"type": "object", "properties": {"task_id": {"type": "string"}}, "required": ["task_id"]}}},
    {"type": "function", "function": {"name": "complete_task", "description": "完成任务",
        "parameters": {"type": "object", "properties": {"task_id": {"type": "string"}}, "required": ["task_id"]}}},
]

# ---- 工具实现 ----
def run_bash(c): return subprocess.run(c, shell=True, capture_output=True, text=True, timeout=30).stdout or "(无输出)"
def run_read(p): return (WORKDIR / p).read_text()
def run_write(p, c): (WORKDIR / p).write_text(c); return f"已写入 {len(c)} 字节"

# ---- 任务系统（s10 新增）：文件级持久化任务图 + blockedBy 依赖 ----
@dataclass
class Task:
    id: str; subject: str; description: str; status: str; owner: str | None; blockedBy: list

def load_task(tid) -> Task:
    d = json.loads((TASKS_DIR / f"{tid}.json").read_text())
    return Task(**d)

def save_task(t: Task):
    (TASKS_DIR / f"{t.id}.json").write_text(json.dumps(asdict(t), ensure_ascii=False, indent=2))

def create_task(subject, description="", blockedBy=None):
    tid = f"task_{secrets.token_hex(4)}"
    t = Task(tid, subject, description or "", "pending", None, blockedBy or [])
    save_task(t)
    return f"已创建 {tid}: {subject}"

def list_tasks():
    tasks = [load_task(f.stem) for f in TASKS_DIR.glob("*.json")]
    return "\n".join(f"  {t.id} [{t.status}] {t.subject} (owner: {t.owner or '-'})" for t in tasks) or "无任务"

def claim_task(task_id, owner="agent"):
    t = load_task(task_id)
    if t.status != "pending": return f"{task_id} 为 {t.status}"
    deps = [d for d in t.blockedBy if not ((TASKS_DIR / f"{d}.json").exists() and load_task(d).status == "completed")]
    if deps: return f"被阻塞: {deps}"
    t.owner, t.status = owner, "in_progress"; save_task(t)
    return f"已认领 {task_id}"

def complete_task(task_id, owner="agent"):
    t = load_task(task_id)
    if t.status != "in_progress": return f"{task_id} 为 {t.status}"
    t.status = "completed"; save_task(t)
    return f"已完成 {task_id}"

TOOL_HANDLERS = {"bash": run_bash, "read_file": run_read, "write_file": run_write,
                 "create_task": create_task, "list_tasks": list_tasks,
                 "claim_task": claim_task, "complete_task": complete_task}

def agent_loop(messages):
    """核心循环：与 s02 相同，工具池多了任务管理工具。"""
    while True:
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
            output = TOOL_HANDLERS[tc.function.name](**args)
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": output})

if __name__ == "__main__":
    q = input("s10 >> ").strip()
    agent_loop([{"role": "user", "content": q}])
```

---

## 动手试一试

1. 输入"创建任务：建数据库表、创建 API 端点（依赖表）、写测试（依赖端点）、写文档（依赖表）"
2. 输入"列出所有任务和状态"
3. 输入"认领第一个未阻塞的任务并完成它"
4. 再次输入"列出任务——哪些被解锁了？"

**观察重点**：`.tasks/` 目录下是否生成了 JSON 文件？完成任务后，被阻塞的任务是否变为可认领？

---

## 常见坑

**坑 1：循环依赖**
- 现象：A 等 B，B 等 A，谁也动不了
- 原因：创建任务时没有检查依赖图是否有环
- 解决：创建时做拓扑检查

**坑 2：任务文件被手动删除**
- 现象：依赖检查报错"文件不存在"
- 原因：依赖的任务文件被删了
- 解决：`load_task_safe` 返回 None 时视为未完成

---

## 与上一章的关系

s09 让 Agent 跨会话记忆知识。s10 让 Agent 跨会话**持久化任务进度**——重启后读 `.tasks/` 目录就能恢复工作。

---

## 下一章预告

任务图已就位，但完整测试套件、依赖安装可能需要好几分钟。同步执行时，Agent 循环被阻塞。

**下一章 s11**：后台任务——慢操作走后台，Agent 继续做别的事。

---

## 速查表

| 概念 | 一句话解释 |
|------|-----------|
| .tasks/ 目录 | 每个任务一个 JSON 文件，持久化到磁盘 |
| blockedBy | 依赖列表，所有依赖完成后任务才能开始 |
| claim_task | 认领任务，pending → in_progress |
| complete_task | 完成任务，in_progress → completed，解锁下游 |
| 状态机 | pending → in_progress → completed，两个动作三种状态 |
