# s12: 定时调度 —— 定时触发，不需要人工启动

> "定时触发，不需要人工踢一脚" —— 按时间表自动启动任务。
> Harness 层：调度 —— 按时间触发 Agent 工作。

---

## 问题引入

s11 改变了命令的执行方式：长命令可以后台跑。但它不记录"什么时候应该开始做什么"，也没有组件持续检查当前时间。

对于"每天早上 9 点跑测试"、"每 30 分钟检查 CI 状态"这类请求，用户仍需要在每个时间点重新提交提示词。Harness 需要存储计划表、在到期时将提示词放入待处理队列、在 Agent 空闲时交付给它。

**类比**：你有一个日程本。你在上面写"每周一 9:00 开会"。你不需要每个周一早上提醒自己——日程本到了时间会自动提醒你。定时调度就是 Agent 的日程本。

---

## 解决方案

Agent 注册一个定时任务：

```
cron:   0 9 * * *     # 每天 09:00
prompt: 跑测试          # 到期时发给 Agent 的提示词
```

每天 09:00，调度器线程匹配到这个任务，把 `[Scheduled] 跑测试` 放入队列。队列处理器等 Agent 空闲时，启动一个 Agent 循环轮次。

---

## 工作原理

### CronJob 数据结构

```python
from dataclasses import dataclass, field

@dataclass
class CronJob:
    id: str
    cron: str              # 五字段 cron 表达式
    prompt: str            # 到期时发送给 Agent 的提示词
    recurring: bool        # 是否重复执行
    durable: bool          # 是否持久化到磁盘
    pending_delivery: bool = False  # 已到期但尚未交付
    last_fired: str | None = None   # 上次触发的分钟标记
```

### 五字段 cron 表达式

```
分钟 小时 日 月 星期
*    *    *  *  *     每分钟
0    9    *  *  *     每天 09:00
*/5  *    *  *  *     每 5 分钟
0    9    *  *  1-5   工作日 09:00
```

支持 `*`、`*/N`、`N`、`N-M`、`N,M,...` 语法。

### 调度器线程：每秒检查

```python
import threading, time
from datetime import datetime

scheduled_jobs = {}  # id -> CronJob
cron_queue = []      # 到期等待交付的任务
cron_lock = threading.Lock()

def poll_due_jobs():
    """每秒检查一次，将到期的任务放入队列。"""
    moment = datetime.now()
    minute_marker = moment.strftime("%Y-%m-%d %H:%M")
    with cron_lock:
        for job in list(scheduled_jobs.values()):
            if job.pending_delivery or job.last_fired == minute_marker:
                continue  # 已在本分钟内触发过
            if cron_matches(job.cron, moment):
                job.pending_delivery = True
                job.last_fired = minute_marker
                cron_queue.append(job)

def scheduler_thread(stop_event):
    """后台线程持续检查到期任务。"""
    while not stop_event.is_set():
        poll_due_jobs()
        time.sleep(1)
```

### 队列处理器：Agent 空闲时交付

```python
def queue_processor_loop(messages, stop_event):
    """等 Agent 空闲时，将到期任务注入对话。"""
    while not stop_event.wait(0.2):
        if not cron_queue:
            continue
        with cron_lock:
            fired = list(cron_queue)
            cron_queue.clear()
        for job in fired:
            messages.append({
                "role": "user",
                "content": f"[Scheduled] {job.prompt}"
            })
        # 启动一轮 Agent 循环处理定时任务
        agent_loop_turn(messages)
        # 成功后标记交付完成
        for job in fired:
            job.pending_delivery = False
            if not job.recurring:
                del scheduled_jobs[job.id]
```

### 持久化边界

| 模式 | 存储位置 | 进程重启后 |
|------|---------|-----------|
| durable=True | `.scheduled_tasks.json` | 重新加载 |
| durable=False | 内存 | 消失 |

交付是**至少一次**（at-least-once）：如果进程在模型接受提示词后、确认写入磁盘前退出，同一任务可能在重启后再次交付。

### 三个工具

```python
def schedule_cron(cron: str, prompt: str, recurring: bool = True, durable: bool = False) -> str:
    """注册一个定时任务。"""
    job_id = f"cron_{secrets.token_hex(4)}"
    job = CronJob(job_id, cron, prompt, recurring, durable)
    scheduled_jobs[job_id] = job
    if durable:
        persist_jobs()
    return f"已注册 {job_id}: cron={cron}, prompt={prompt}"

def list_crons() -> str:
    """列出所有定时任务。"""
    return "\n".join(f"  {j.id}: cron={j.cron} prompt={j.prompt}"
                     for j in scheduled_jobs.values()) or "无定时任务"

def cancel_cron(job_id: str) -> str:
    """取消一个定时任务。"""
    if job_id in scheduled_jobs:
        del scheduled_jobs[job_id]
        persist_jobs()
        return f"已取消 {job_id}"
    return f"未找到 {job_id}"
```

---

## 完整代码（核心片段）

```python
import os, json, subprocess, secrets, threading, time
from pathlib import Path
from dataclasses import dataclass, asdict
from datetime import datetime
from openai import OpenAI   # DeepSeek 兼容 OpenAI SDK，所以用 openai 包
from dotenv import load_dotenv

# 从 .env 文件加载环境变量
load_dotenv()

# ---- DeepSeek API 客户端初始化 ----
deepseek_client = OpenAI(api_key=os.getenv("DEEPSEEK_API_KEY"), base_url="https://api.deepseek.com")
MODEL = os.getenv("MODEL_ID", "deepseek-chat")  # 模型名称
WORKDIR = Path(".").resolve()                    # 工作目录的绝对路径
SYSTEM = f"你是编程助手。可用 schedule_cron/list_crons/cancel_cron 管理定时任务。"

TOOLS = [
    {"type": "function", "function": {"name": "bash", "description": "执行命令",
        "parameters": {"type": "object", "properties": {"command": {"type": "string"}}, "required": ["command"]}}},
    {"type": "function", "function": {"name": "read_file", "description": "读取文件",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}}},
    {"type": "function", "function": {"name": "write_file", "description": "写入文件",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]}}},
    {"type": "function", "function": {"name": "schedule_cron", "description": "注册定时任务",
        "parameters": {"type": "object", "properties": {
            "cron": {"type": "string"}, "prompt": {"type": "string"},
            "recurring": {"type": "boolean"}, "durable": {"type": "boolean"}},
            "required": ["cron", "prompt"]}}},
    {"type": "function", "function": {"name": "list_crons", "description": "列出定时任务",
        "parameters": {"type": "object", "properties": {}}}},
    {"type": "function", "function": {"name": "cancel_cron", "description": "取消定时任务",
        "parameters": {"type": "object", "properties": {"job_id": {"type": "string"}}, "required": ["job_id"]}}},
]

# ---- 工具实现 ----
def run_bash(c): return subprocess.run(c, shell=True, capture_output=True, text=True, timeout=30).stdout or "(无输出)"
def run_read(p): return (WORKDIR / p).read_text()
def run_write(p, c): (WORKDIR / p).write_text(c); return f"已写入 {len(c)} 字节"

# ---- 定时调度（s12 新增）：五字段 cron 表达式 + 至少一次交付 ----
@dataclass
class CronJob:
    id: str; cron: str; prompt: str; recurring: bool; durable: bool
    pending_delivery: bool = False; last_fired: str = None

scheduled_jobs = {}; cron_queue = []; cron_lock = threading.Lock()
PERSIST_FILE = WORKDIR / ".scheduled_tasks.json"

def cron_matches(expr, dt):
    """简单的 cron 匹配（分钟 小时 日 月 星期）。"""
    fields = expr.split()
    if len(fields) != 5: return False
    vals = [dt.minute, dt.hour, dt.day, dt.month, dt.weekday()]
    for field, val in zip(fields, vals):
        if field == "*": continue
        if field.startswith("*/"):
            if val % int(field[2:]) != 0: return False
        elif str(val) not in field.split(","): return False
    return True

def schedule_cron(cron, prompt, recurring=True, durable=False):
    jid = f"cron_{secrets.token_hex(4)}"
    scheduled_jobs[jid] = CronJob(jid, cron, prompt, recurring, durable)
    if durable:
        PERSIST_FILE.write_text(json.dumps({k: asdict(v) for k,v in scheduled_jobs.items()}))
    return f"已注册 {jid}: {cron} -> {prompt}"

def list_crons():
    return "\n".join(f"  {j.id}: {j.cron} -> {j.prompt}" for j in scheduled_jobs.values()) or "无"

def cancel_cron(job_id):
    if job_id in scheduled_jobs:
        del scheduled_jobs[job_id]; return f"已取消 {job_id}"
    return f"未找到 {job_id}"

TOOL_HANDLERS = {"bash": run_bash, "read_file": run_read, "write_file": run_write,
                 "schedule_cron": schedule_cron, "list_crons": list_crons, "cancel_cron": cancel_cron}

# 调度器线程
RUNTIME_STOP = threading.Event()
def scheduler_loop():
    while not RUNTIME_STOP.is_set():
        now = datetime.now(); mm = now.strftime("%H:%M")
        with cron_lock:
            for j in list(scheduled_jobs.values()):
                if j.last_fired == mm: continue
                if cron_matches(j.cron, now):
                    j.last_fired = mm; cron_queue.append(j)
        time.sleep(1)

def agent_loop(messages):
    """核心循环：每轮先注入 cron 触发的通知，再调用 API。"""
    while True:
        # ★ s12 新增：注入已触发的定时任务
        with cron_lock:
            fired = list(cron_queue); cron_queue.clear()
        for j in fired:
            messages.append({"role": "user", "content": f"[Scheduled] {j.prompt}"})
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
    threading.Thread(target=scheduler_loop, daemon=True).start()
    try:
        q = input("s12 >> ").strip()
        agent_loop([{"role": "user", "content": q}])
    finally:
        RUNTIME_STOP.set()
```

---

## 动手试一试

1. 输入"每 2 分钟执行 `date` 命令，并持久化"
2. 输入"列出所有定时任务"
3. 等 2 分钟，观察 `[Scheduled]` 消息
4. 输入"取消刚才创建的定时任务"

**观察重点**：`.scheduled_tasks.json` 是否生成？到期时是否自动触发 Agent？

---

## 常见坑

**坑 1：进程退出后定时任务消失**
- 现象：重启后定时任务没了
- 原因：`durable=false` 时任务只在内存中
- 解决：重要任务设 `durable=true`

**坑 2：定时任务需要交互式审批**
- 现象：后台线程弹出 `input()` 但没人应答
- 原因：定时触发的 Agent 轮次不应弹交互式审批
- 解决：定时轮次自动拒绝需审批的操作

---

## 与上一章的关系

s11 让慢操作不阻塞。s12 解决"什么时候开始"——按时间表自动触发，不需要人盯着。

---

## 下一章预告

调度器可以在指定时间启动 Agent 循环，但还是一个 Agent 处理。当任务需要并行调查、跨模块修改、合并结果时，Harness 还需要**多个 Agent 分工协作**。

**下一章 s13**：智能体团队——Lead 分配任务，队友独立运行，结果通过收件箱返回。

---

## 速查表

| 概念 | 一句话解释 |
|------|-----------|
| CronJob | 定时任务数据：cron 表达式 + 提示词 + 是否持久化 |
| 调度器线程 | 每秒检查一次，到期任务放入队列 |
| 队列处理器 | Agent 空闲时从队列取任务，注入对话 |
| durable | 持久化到磁盘，进程重启后自动恢复 |
| 至少一次交付 | 极端情况下同一任务可能交付两次 |
