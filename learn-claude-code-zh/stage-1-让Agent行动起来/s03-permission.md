# s03: 权限系统 —— 先设边界，再给自由

> "执行前先检查权限" —— 权限管道决定哪些操作需要审批。
> Harness 层：权限 —— 工具执行前的一道门。

---

## 问题引入

s02 的 Agent 有 5 个工具。文件工具受路径保护，但 bash 完全无限制。让它"清理一下项目"，它可能执行 `rm -rf /`。

安全不能靠信任模型——它可能在无意中执行破坏性命令。**必须在代码层面加一道门**：每个工具执行前都检查一次。

**类比**：你请了一个实习生来帮忙。你很信任他的能力，但你不会给他办公室的所有钥匙。保险柜的钥匙不给，服务器机房的钥匙不给，其他普通的门可以自由进出。这就是权限系统——**先设边界，再给自由**。

---

## 解决方案

s02 的循环完全保留。唯一的改动是在工具执行前插入 `check_permission()`——每个工具调用按固定顺序通过三道门：

| 门 | 作用 | 命中后 |
|----|------|--------|
| 1. 拒绝清单 | 永远禁止的操作（`rm -rf /`、`sudo`） | 立即拒绝，不执行 |
| 2. 规则匹配 | 视上下文而定的操作（读写工作目录外、`rm` 文件） | 交给第 3 道门 |
| 3. 用户审批 | 第 2 道门命中后，暂停等用户确认 | 用户决定允许或拒绝 |

三道门都没命中 → 直接执行。大多数常规操作走这条路。

---

## 工作原理

### 第 1 道门：硬拒绝清单

```python
# 永远不允许执行的命令模式
DENY_LIST = [
    "rm -rf /", "sudo", "shutdown", "reboot",
    "mkfs", "dd if=", "> /dev/sda",
]

def check_deny_list(command: str) -> str | None:
    """检查命令是否在拒绝清单中。命中返回原因，否则返回 None。"""
    for pattern in DENY_LIST:
        if pattern in command:
            return f"已阻止：'{pattern}' 在拒绝清单中"
    return None
```

### 第 2 道门：规则匹配

描述"什么时候需要问用户"。每条规则指定一个工具和检查条件：

```python
PERMISSION_RULES = [
    {
        "tools": ["read_file", "write_file", "edit_file"],
        "check": lambda args: not (
            WORKDIR / args.get("path", "")
        ).resolve().is_relative_to(WORKDIR),
        "message": "访问工作目录外的文件",
    },
    {
        "tools": ["bash"],
        "check": lambda args: any(
            kw in args.get("command", "")
            for kw in ["rm ", "> /etc/", "chmod 777"]
        ),
        "message": "潜在破坏性命令",
    },
]

def check_rules(tool_name: str, args: dict) -> str | None:
    """检查工具调用是否匹配某条权限规则。"""
    for rule in PERMISSION_RULES:
        if tool_name in rule["tools"] and rule["check"](args):
            return rule["message"]
    return None
```

### 第 3 道门：用户审批

```python
def ask_user(tool_name: str, args: dict, reason: str) -> str:
    """暂停执行，询问用户是否允许。"""
    print(f"\n⚠️  {reason}")
    print(f"   工具: {tool_name}({args})")
    choice = input("   允许？[y/N] ").strip().lower()
    return "allow" if choice in ("y", "yes") else "deny"
```

### 三道门串联

```python
def check_permission(tool_name: str, args: dict) -> bool:
    """权限检查管道：拒绝清单 → 规则匹配 → 用户审批。"""
    # 第 1 道门：硬拒绝
    if tool_name == "bash":
        reason = check_deny_list(args.get("command", ""))
        if reason:
            print(f"\n⛔ {reason}")
            return False

    # 第 2 + 3 道门：规则匹配 → 用户审批
    reason = check_rules(tool_name, args)
    if reason:
        decision = ask_user(tool_name, args, reason)
        if decision == "deny":
            return False

    return True  # 三道门都没命中，允许执行
```

### 循环中只加一行

```python
# s02 的循环，只加了一行权限检查：
for tc in msg.tool_calls:
    args = json.loads(tc.function.arguments)
    if not check_permission(tc.function.name, args):   # ← 新增
        messages.append({"role": "tool", "tool_call_id": tc.id,
                         "content": "权限被拒绝。"})
        continue
    handler = TOOL_HANDLERS[tc.function.name]          # s02 原有
    output = handler(**args)
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

# ---- 工具定义（同 s02，5 个工具）----
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

# ---- 工具实现（简写版）----
def run_bash(command): return subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30).stdout or "(无输出)"
def run_read(path): return (WORKDIR / path).read_text()
def run_write(path, content):
    (WORKDIR / path).write_text(content)
    return f"已写入 {len(content)} 字节"
def run_edit(path, old_text, new_text):
    p = WORKDIR / path; t = p.read_text()
    if old_text not in t: return "错误：未找到文本"
    p.write_text(t.replace(old_text, new_text, 1)); return f"已编辑 {path}"
def run_glob(pattern):
    import glob as g
    return "\n".join(g.glob(pattern, root_dir=str(WORKDIR)))

# ---- 工具分发表 ----
TOOL_HANDLERS = {"bash": run_bash, "read_file": run_read, "write_file": run_write,
                 "edit_file": run_edit, "glob": run_glob}

# ---- 权限系统（s03 新增）----
# 第 1 道门：硬拒绝清单，匹配到就直接阻止，不问用户
DENY_LIST = ["rm -rf /", "sudo", "shutdown", "reboot", "mkfs"]
# 第 2 道门：规则匹配，定义“什么情况下需要问用户”
PERMISSION_RULES = [
    {"tools": ["read_file", "write_file", "edit_file"],
     "check": lambda args: not (WORKDIR / args.get("path", "")).resolve().is_relative_to(WORKDIR),
     "message": "访问工作目录外的文件"},
    {"tools": ["bash"],
     "check": lambda args: any(kw in args.get("command", "") for kw in ["rm ", "> /etc/"]),
     "message": "潜在破坏性命令"},
]

def check_permission(tool_name, args):
    """权限检查管道：拒绝清单 → 规则匹配 → 用户审批。
    返回 True 表示允许执行，False 表示拒绝。"""
    # 第 1 道门：检查拒绝清单（仅 bash 工具）
    if tool_name == "bash":
        for p in DENY_LIST:
            if p in args.get("command", ""):
                print(f"\n⛔ 已阻止：'{p}' 在拒绝清单中")
                return False  # 硬拒绝，不执行
    # 第 2 + 3 道门：规则匹配 → 如果命中，暂停等用户确认
    for rule in PERMISSION_RULES:
        if tool_name in rule["tools"] and rule["check"](args):
            print(f"\n⚠️  {rule['message']} — {tool_name}({args})")
            if input("   允许？[y/N] ").strip().lower() not in ("y", "yes"):
                return False  # 用户拒绝
    return True  # 三道门都没命中，允许执行

def agent_loop(messages):
    """核心循环：与 s02 相同，只在工具执行前加了权限检查。"""
    while True:
        # 调用 DeepSeek API
        response = deepseek_client.chat.completions.create(
            model=MODEL, messages=[{"role": "system", "content": SYSTEM}] + messages,
            tools=TOOLS, max_tokens=4096)
        msg = response.choices[0].message  # 取出模型回复
        messages.append(msg)                # 追加到对话历史
        if not msg.tool_calls:              # 没有工具调用 → 模型说完了
            print(f"\nAgent: {msg.content}"); return
        for tc in msg.tool_calls:
            args = json.loads(tc.function.arguments)
            # ★ s03 新增：执行前检查权限
            if not check_permission(tc.function.name, args):
                messages.append({"role": "tool", "tool_call_id": tc.id, "content": "权限被拒绝"})
                continue  # 权限被拒绝，跳过这个工具调用
            # 权限通过，执行工具
            output = TOOL_HANDLERS[tc.function.name](**args)
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": output})

if __name__ == "__main__":
    query = input("s03 >> ").strip()
    agent_loop([{"role": "user", "content": query}])
```

---

## 动手试一试

1. 输入"在当前目录创建一个 test.txt"（应该直接通过）
2. 输入"删除文件 test.txt"（bash + rm 触发第 2 道门）
3. 输入"当前目录有哪些文件？"（只读操作，全部通过）
4. 输入"写一个文件到 /etc/something"（写工作目录外触发第 2 道门）

**观察重点**：哪些操作直接通过了？哪些需要你确认？哪些被直接拒绝？

---

## 常见坑

**坑 1：拒绝清单不够全面**
- 现象：模型执行了 `rm -rf *` 但没被拦住
- 原因：拒绝清单只写了 `rm -rf /`，没覆盖 `rm -rf *`
- 解决：拒绝清单是简单字符串匹配，真实产品需要更完善的规则引擎

**坑 2：交互式审批阻塞后台任务**
- 现象：Agent 在后台运行时，权限审批弹窗没人应答
- 原因：`input()` 是同步阻塞的
- 解决：后台任务场景应默认拒绝或预设策略（s15 会讲到）

---

## 与上一章的关系

s02 给了 Agent 一个工具箱。s03 在工具箱上加了一把锁——不是所有工具都能随便用。

---

## 下一章预告

权限检查已经就位——但每个检查都是硬编码在循环里的 `check_permission()`。如果想加日志呢？想在写文件后自动 `git add` 呢？把这些扩展逻辑散在循环里，循环就会膨胀。

**下一章 s04**：给循环加上钩子（Hook）。扩展逻辑挂在钩子上，循环本身保持干净。

---

## 速查表

| 概念 | 一句话解释 |
|------|-----------|
| DENY_LIST | 硬拒绝清单，匹配到就直接阻止，不问用户 |
| PERMISSION_RULES | 规则列表，定义"什么情况下需要问用户" |
| 三道门 | 拒绝清单 → 规则匹配 → 用户审批，按顺序检查 |
| check_permission | 权限管道入口，返回 True 表示允许，False 表示拒绝 |
