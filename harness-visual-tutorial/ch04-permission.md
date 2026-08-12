# 第 4 章：权限系统

> **一句话概括**：给 Agent 设门禁——有些操作直接放行，有些直接拒绝，有些要先问你。

![权限门控](images/ch04-permission-gate.png)

---

## 通俗理解

你的 Agent 现在能执行任何命令了——包括 `rm -rf /`。这就像一个实习生拿着公司所有门禁卡的万能钥匙。

权限系统就是**门禁**：

| 操作类型 | 权限级别 | 类比 |
|---------|---------|------|
| 读文件、`ls`、`cat` | 自动放行 | 实习生可以自由进出的区域 |
| 写文件、执行脚本 | 需要确认 | 需要刷卡 + 密码的房间 |
| `rm -rf`、`sudo`、网络请求 | 自动拒绝 | 绝对不能进的机房 |

---

## 核心概念

### Permission Check（权限检查）

在执行工具**之前**，先检查这个操作是否被允许。三种结果：

- **ALLOW**：安全操作，直接执行
- **DENY**：危险操作，拒绝并告诉 LLM
- **ASK**：不确定，先问用户

### Allow/Deny List（白名单/黑名单）

- 白名单：已知安全的操作模式
- 黑名单：已知危险的操作模式
- 不在名单中的：走 ASK 流程

---

## 完整代码

```python
import os, json, subprocess
from pathlib import Path
from openai import OpenAI   # DeepSeek 兼容 OpenAI SDK，所以用 openai 包
from dotenv import load_dotenv

load_dotenv()

deepseek_client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com",
)
MODEL = os.getenv("MODEL_ID", "deepseek-chat")
WORKDIR = Path(".").resolve()

SYSTEM = f"你是一个编程助手，工作目录是 {WORKDIR}。你可以执行命令和读取文件。"

# ---- 工具定义（同 ch03）----
TOOLS = [
    {"type": "function", "function": {"name": "bash", "description": "执行 Shell 命令",
        "parameters": {"type": "object", "properties": {"command": {"type": "string"}}, "required": ["command"]}}},
    {"type": "function", "function": {"name": "read_file", "description": "读取文件",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}}},
]

# ---- 工具实现（同 ch03）----
def run_bash(command: str) -> str:
    result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
    return result.stdout or "(无输出)"

def run_read_file(path: str) -> str:
    file_path = WORKDIR / path
    if not file_path.exists():
        return f"错误：文件 {path} 不存在"
    return file_path.read_text(encoding="utf-8")

TOOL_HANDLERS = {"bash": run_bash, "read_file": run_read_file}


# ==========================================
# ★ 本章新增：权限系统
# ==========================================

# 危险命令模式（黑名单）：匹配到就拒绝
DENY_PATTERNS = [
    "rm -rf",       # 递归删除
    "sudo",         # 提权
    "chmod 777",    # 开放所有权限
    "curl.*|.*sh",  # 下载并执行脚本
    "mkfs",         # 格式化磁盘
    ":(){:|:&};:", # fork 炸弹
]

# 安全命令模式（白名单）：匹配到就放行
ALLOW_PATTERNS = [
    "ls",           # 列出文件
    "cat",          # 查看文件
    "head",         # 查看文件开头
    "tail",         # 查看文件末尾
    "wc",           # 统计字数/行数
    "find",         # 查找文件
    "grep",         # 搜索内容
    "echo",         # 输出文本
    "date",         # 查看日期
    "pwd",          # 当前目录
]


def check_permission(tool_name: str, args: dict) -> str:
    """
    检查操作是否被允许。

    返回:
        "allow" - 允许执行
        "deny"  - 拒绝执行
        "ask"   - 需要用户确认
    """
    if tool_name == "read_file":
        return "allow"  # 读文件总是安全的

    if tool_name == "bash":
        command = args.get("command", "")

        # 检查黑名单：包含危险模式就拒绝
        for pattern in DENY_PATTERNS:
            if pattern in command:
                return "deny"

        # 检查白名单：只包含安全命令就放行
        first_word = command.split()[0] if command.split() else ""
        if first_word in ALLOW_PATTERNS:
            return "allow"

        # 既不在白名单也不在黑名单：需要确认
        return "ask"

    return "ask"  # 未知工具默认需要确认


# ==========================================
# Agent 循环（整合权限检查）
# ==========================================
def agent_loop(messages: list):
    while True:
        response = deepseek_client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "system", "content": SYSTEM}] + messages,
            tools=TOOLS,
        )
        msg = response.choices[0].message

        if not msg.tool_calls:
            print(f"\nAgent: {msg.content}")
            return

        messages.append(msg)
        for tool_call in msg.tool_calls:
            args = json.loads(tool_call.function.arguments)

            # ★ 新增：执行前先检查权限
            permission = check_permission(tool_call.function.name, args)

            if permission == "deny":
                # 拒绝：告诉 LLM 这个操作不被允许
                output = f"[权限拒绝] 操作 '{args.get('command', '')}' 包含危险命令，已被阻止"
                print(f"  ⛔ 拒绝: {output}")

            elif permission == "ask":
                # 需要确认：问用户
                cmd = args.get("command", "")
                user_ok = input(f"  ⚠️  是否允许执行 '{cmd}'？(y/n): ").strip().lower()
                if user_ok == "y":
                    output = TOOL_HANDLERS[tool_call.function.name](**args)
                else:
                    output = "[用户拒绝] 操作被用户取消"

            else:
                # 放行：直接执行
                output = TOOL_HANDLERS[tool_call.function.name](**args)
                print(f"  ✅ 执行: {tool_call.function.name}({args})")

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": output,
            })


if __name__ == "__main__":
    query = input("你: ").strip()
    messages = [{"role": "user", "content": query}]
    agent_loop(messages)
```

---

## 权限检查流程图

每次工具调用都会经过权限检查，下面是完整的决策流程：

![权限检查流程](images/ch04-permission-flow.png)

### 纵深防御：三层安全

权限系统不是唯一的安全层。完整的防护是**多层叠加**的：

![纵深防御](images/ch04-safety-layers.png)

| 层级 | 防护机制 | 作用 |
|------|---------|------|
| 第 1 层 | LLM 自身约束 | 模型训练时学到的安全行为 |
| 第 2 层 | Harness 权限系统 | 代码级的 allow/deny 检查（本章） |
| 第 3 层 | 操作系统权限 | 文件权限、沙箱隔离等系统级保护 |

---

## 运行它

把上面的代码复制到 `ch04-permission.py` 文件中，然后：

```bash
cd harness-visual-tutorial
python ch04-permission.py
```

试试输入：
- "帮我列出当前目录的文件" → `ls` 在白名单，自动放行
- "删除所有 .log 文件" → 不在白名单，会问你是否允许
- "执行 rm -rf /" → 在黑名单，自动拒绝

---

## 动手试一试

1. **扩展黑名单**：添加 `pip uninstall` 到 DENY_PATTERNS
2. **观察权限日志**：注意终端输出的 ✅ / ⚠️ / ⛔ 标记，理解三种权限级别

---

## 小结与下一章

本章你给 Agent 加了门禁：黑名单拒绝危险操作，白名单放行安全操作，不确定的先问用户。

Agent 现在能安全地工作了。但它每次启动都"失忆"——不记得上次你告诉过它什么。下一章我们给它一本**笔记本**：记忆系统。

---

## 检查点

- [ ] 能解释三种权限级别：allow / deny / ask
- [ ] 理解权限检查发生在工具执行**之前**
- [ ] 代码能跑起来，安全命令自动放行，危险命令被拒绝
