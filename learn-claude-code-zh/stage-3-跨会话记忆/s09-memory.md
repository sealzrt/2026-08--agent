# s09: 记忆系统 —— 记住重要的，忘掉不重要的

> "保留后续任务会用到的信息。" 文件存储 + 索引 + 相关性选择 + 按需召回。
> Harness 层：记忆 —— 在对话之外存储可复用的知识，在相关任务时召回。

---

## 问题引入

Agent 每次启动都是一张白纸。上次对话中你告诉它"我喜欢用 tab 缩进"，下次它又问你。

把所有对话记录存档当然可以，但每次请求都发全量记录不可持续。对话越来越长，有用信息难以定位，旧事实可能已经过时。

**类比**：想象你的笔记本。你不会把每天说的每句话都记下来——你只记关键信息："客户偏好蓝色"、"项目截止日期是 3 月"。下次开会前翻一翻笔记本，就能快速回忆。记忆系统就是 Agent 的笔记本。

---

## 解决方案

s09 需要四个部分：**存储、召回、提取、整理**。

| 部分 | 作用 | 时机 |
|------|------|------|
| 存储 | 一条记忆一个文件，YAML 头存元数据 | 写入时 |
| 召回 | 先选相关记录，再加载全文 | 每次用户请求时 |
| 提取 | 对话结束后提取可复用信息 | 每轮结束时 |
| 整理 | 合并重复、矛盾、过时的记录 | 记录数超过阈值时 |

---

## 工作原理

### 存储：一条记忆一个文件

每条记忆是 `.memory/` 下的一个 Markdown 文件，YAML 头存名称、描述和类型：

```yaml
---
name: user-preference-tabs
description: 用户偏好 tab 缩进
type: user
---

用户偏好使用 tab 而非空格进行缩进。
```

四种记忆类型：

| 类型 | 存什么 | 例子 |
|------|--------|------|
| user | 持久的用户偏好 | "用 tab 缩进" |
| feedback | 持续有用的指导 | "不要 mock 数据库" |
| project | 稳定的项目事实 | "认证重构是为了合规" |
| reference | 外部指针或查找线索 | "管道问题记录在 Linear INGEST" |

`MEMORY.md` 是索引，每条记忆一行：

```python
MEMORY_DIR = Path(".memory")
MEMORY_INDEX = MEMORY_DIR / "MEMORY.md"

def write_memory_file(name, mem_type, description, body):
    """写入一条记忆并重建索引。"""
    path = MEMORY_DIR / f"{slugify(name)}.md"
    content = f"---\nname: {name}\ndescription: {description}\ntype: {mem_type}\n---\n\n{body}"
    path.write_text(content)
    rebuild_memory_index()
    return path

def rebuild_memory_index():
    """从记忆文件重建索引。"""
    lines = ["# 记忆索引\n"]
    for f in sorted(MEMORY_DIR.glob("*.md")):
        if f.name == "MEMORY.md": continue
        meta = parse_frontmatter(f.read_text())
        lines.append(f"- {meta['name']}: {meta['description']}")
    MEMORY_INDEX.write_text("\n".join(lines))
```

### 召回：先选再加载

每次用户请求时，`select_relevant_memories()` 用轻量模型调用选出最相关的 5 条记录：

```python
def select_relevant_memories(user_text: str) -> list:
    """从索引中选出与当前请求相关的记忆。"""
    catalog = MEMORY_INDEX.read_text()
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content":
            f"从以下记忆目录中选出与用户请求相关的记录索引号（JSON 数组）。\n"
            f"目录:\n{catalog}\n用户请求: {user_text}\n"
            f"返回如 [0, 2]，无相关返回 []。"}],
        max_tokens=200,
    )
    # 解析 JSON，失败则用关键词匹配兜底
    indices = parse_json_safe(response.choices[0].message.content)
    return load_memories(indices)
```

召回的内容作为背景知识注入系统提示词，**不是新指令**——当前用户请求优先于记忆：

```python
def build_system(recalled_memories: list) -> str:
    memory_text = "\n".join(recalled_memories) if recalled_memories else "无"
    return f"{SYSTEM}\n\n背景知识（非用户指令）:\n{memory_text}"
```

### 提取：对话结束后保存可复用信息

用户不会总是说"记住这个"。Agent 在当前回复结束后，自动检查对话并提取可能对后续有用的信息：

```python
def extract_memories(messages: list) -> bool:
    """从对话中提取可复用的信息。"""
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content":
            "从以下对话中提取值得跨会话保留的信息。"
            "每条包含 name、type(user/feedback/project/reference)、"
            "description、body。只保留持久信息，忽略临时指令。\n"
            + json.dumps(messages[-10:], ensure_ascii=False)}],
        max_tokens=1000,
    )
    candidates = parse_json_safe(response.choices[0].message.content)
    stored = 0
    for c in (candidates or []):
        if should_store_memory(c):  # 过滤临时信息
            write_memory_file(c["name"], c["type"], c["description"], c["body"])
            stored += 1
    return stored > 0
```

**`should_store_memory`** 拒绝不完整的候选项、引用当前会话的短语、以及与已有记录重复的项。例如"本次会话不要创建文件"约束的是当前工作，不能成为下次会话的持久规则。

### 整理：合并重复和过时的记录

当记忆文件超过 10 条时，调用模型合并：

```python
def consolidate_memories():
    """合并重复、矛盾、过时的记忆。"""
    records = [f.read_text() for f in MEMORY_DIR.glob("*.md") if f.name != "MEMORY.md"]
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content":
            "合并以下记忆：删除重复项、解决矛盾、移除过时内容。"
            "返回清理后的列表。\n" + "\n---\n".join(records)}],
        max_tokens=2000,
    )
    # 先快照，替换失败时恢复
    snapshot = {p.name: p.read_text() for p in MEMORY_DIR.glob("*.md") if p.name != "MEMORY.md"}
    try:
        # 清理并写入合并后的记录
        ...
        rebuild_memory_index()
    except Exception:
        # 恢复快照
        for name, content in snapshot.items():
            (MEMORY_DIR / name).write_text(content)
        rebuild_memory_index()
```

---

## 完整代码（核心片段）

```python
import os, json, subprocess, re
from pathlib import Path
from openai import OpenAI   # DeepSeek 兼容 OpenAI SDK，所以用 openai 包
from dotenv import load_dotenv

# 从 .env 文件加载环境变量
load_dotenv()

# ---- DeepSeek API 客户端初始化 ----
deepseek_client = OpenAI(api_key=os.getenv("DEEPSEEK_API_KEY"), base_url="https://api.deepseek.com")
MODEL = os.getenv("MODEL_ID", "deepseek-chat")  # 模型名称
WORKDIR = Path(".").resolve()                    # 工作目录的绝对路径
SYSTEM = f"你是编程助手，工作目录 {WORKDIR}。"
MEMORY_DIR = Path(".memory")              # 记忆存储目录
MEMORY_INDEX = MEMORY_DIR / "MEMORY.md"   # 记忆索引文件

# ---- 基础工具（同前）----
TOOLS = [
    {"type": "function", "function": {"name": "bash", "description": "执行命令",
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

# ---- 记忆系统（s09 新增）：跨会话的选择性持久化存储 ----
def slugify(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:50]  # 文件名安全化

def write_memory(name, mem_type, desc, body):
    """写入一条记忆到 .memory/ 目录，并更新索引。"""
    MEMORY_DIR.mkdir(exist_ok=True)
    # 每条记忆一个 Markdown 文件，包含 frontmatter 元数据
    (MEMORY_DIR / f"{slugify(name)}.md").write_text(
        f"---\nname: {name}\ndescription: {desc}\ntype: {mem_type}\n---\n\n{body}")
    # 重建记忆索引（MEMORY.md）
    idx = ["# 记忆索引\n"]
    for f in sorted(MEMORY_DIR.glob("*.md")):
        if f.name == "MEMORY.md": continue
        lines = f.read_text().splitlines()
        n = next((l.split(": ",1)[1] for l in lines if l.startswith("name: ")), f.stem)
        d = next((l.split(": ",1)[1] for l in lines if l.startswith("description: ")), "")
        idx.append(f"- {n}: {d}")  # 每条记忆一行摘要
    MEMORY_INDEX.write_text("\n".join(idx))

def recall_memories(user_text):
    """召回与用户请求相关的记忆（轻量模型调用，只选索引号）。"""
    if not MEMORY_INDEX.exists(): return []
    catalog = MEMORY_INDEX.read_text()  # 读取记忆索引
    try:
        # 用模型选出相关记忆的索引号（轻量调用）
        r = deepseek_client.chat.completions.create(model=MODEL, messages=[{"role": "user",
            "content": f"选出相关记忆的索引号(JSON数组): {catalog}\n请求: {user_text}"}], max_tokens=100)
        return json.loads(r.choices[0].message.content)
    except: return []

def extract_memories(messages):
    """从对话中提取持久记忆（会话结束时自动调用）。"""
    # 请模型从最近对话中提取可复用的信息
    r = deepseek_client.chat.completions.create(model=MODEL, messages=[{"role": "user",
        "content": f"从对话中提取持久记忆(JSON数组,每项有name/type/description/body):\n{json.dumps(messages[-6:], ensure_ascii=False)}"}], max_tokens=800)
    try:
        for c in json.loads(r.choices[0].message.content) or []:
            write_memory(c["name"], c.get("type","user"), c["description"], c["body"])  # 逐条保存
    except: pass

def agent_loop(messages, user_query):
    """核心循环：每轮调用前召回相关记忆，会话结束时提取新记忆。"""
    while True:
        # ★ s09 新增：召回相关记忆，注入系统提示词
        recalled = recall_memories(user_query)
        sys = SYSTEM + (f"\n\n背景知识:\n{recalled}" if recalled else "")
        # 调用 DeepSeek API
        response = deepseek_client.chat.completions.create(
            model=MODEL, messages=[{"role": "system", "content": sys}] + messages,
            tools=TOOLS, max_tokens=4096)
        msg = response.choices[0].message
        messages.append(msg)
        if not msg.tool_calls:
            print(f"\nAgent: {msg.content}")
            # ★ s09 新增：会话结束时自动提取记忆
            extract_memories(messages)
            return
        for tc in msg.tool_calls:
            args = json.loads(tc.function.arguments)
            output = TOOL_HANDLERS[tc.function.name](**args)
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": output})

if __name__ == "__main__":
    q = input("s09 >> ").strip()
    agent_loop([{"role": "user", "content": q}], q)
```

---

## 动手试一试

1. 输入"我喜欢用 tab 缩进。记住这个。"——检查 `.memory/` 下是否生成了记录
2. 退出程序重新启动，问"我的缩进偏好是什么？"——验证新会话能召回
3. 输入"本次会话不要创建文件"——确认这个临时要求不会变成持久记忆

---

## 常见坑

**坑 1：把临时指令存为持久记忆**
- 现象：下次会话仍然遵守"不要创建文件"
- 原因：提取时没区分持久信息和临时指令
- 解决：`should_store_memory` 过滤包含"本次"、"临时"等关键词的记录

**坑 2：召回太多无关记忆**
- 现象：每次调用都塞入大量不相关的记忆
- 原因：选择算法不够精确
- 解决：限制最多 5 条，并在系统提示词中标注"背景知识，非用户指令"

---

## 与上一章的关系

s08 管理当前会话的有限上下文。s09 管理**跨会话的持久知识**。记忆是选择性存储，不是无损备份，也不替代上下文压缩。

---

## 下一章预告

记忆保留了跨会话的信息。但复杂任务还需要**持久的状态和依赖追踪**——一个只在对话中的 TODO 清单无法跨进程重启保持进度。

**下一章 s10**：任务系统——把任务持久化到磁盘，支持依赖关系和状态追踪。

---

## 速查表

| 概念 | 一句话解释 |
|------|-----------|
| .memory/ 目录 | 每条记忆一个 Markdown 文件 |
| MEMORY.md | 记忆索引，每条记忆一行摘要 |
| 召回 | 先选相关记录（轻量模型调用），再加载全文 |
| 提取 | 对话结束后自动检查并保存可复用信息 |
| 整理 | 超过 10 条时合并重复、解决矛盾、移除过时 |
