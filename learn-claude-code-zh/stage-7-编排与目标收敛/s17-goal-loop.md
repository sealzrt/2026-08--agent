# s17: 目标循环 —— 由目标决定循环何时可以停止

> "模型不再调用工具只意味着那一轮想停止。独立的评估器决定整个目标是否完成。"
> Harness 层：持续执行 —— 每轮结束时检查完成条件，未完成时自动继续。

---

## 问题引入

从 s01 开始，Agent 循环就有一个简单的退出条件：模型停止调用工具，程序返回。

这对普通对话足够了，但对"一直修到所有测试通过"或"完成所有验收标准"这类任务不够。模型可能做完一部分就认为工作完成了。没有新的 tool_use 只意味着当前轮结束了，不意味着整个目标已达成。

**类比**：你让装修工人翻新一间房子。工人刷完墙就说"我干完了"。但你还期望他铺地板、装灯具、清理干净。你需要一个**独立的质检员**——每完成一轮工作，质检员检查一遍清单，没达标就告诉工人"地板还没铺，继续"。

---

## 解决方案

`/goal` 添加一个**独立的决策**在真正返回之前：

```python
# 没有 goal 时：模型不调用工具 → 直接返回（同 s01）
# 有 goal 时：模型不调用工具 → 评估器检查目标
#   → 目标达成 → 返回
#   → 目标未达成 → 注入原因，继续循环
```

### /goal 是会话级的 Stop 钩子

```
/goal pytest tests/auth 退出码为 0 且 lint 无错误
```

程序存储完成条件，立即把它作为当前任务发给主模型。当主模型停止调用工具时，循环在返回前运行 Goal Stop 钩子：

```python
if not msg.tool_calls:
    # Goal 评估
    decision = evaluate_goal(messages)
    if decision["action"] == "block":
        # 目标未达成，注入原因，继续
        messages.append({"role": "user", "content": decision["reason"]})
        continue
    # 目标达成或无 goal，退出
    return
```

---

## 工作原理

### 评估器与工作者分离

主模型编辑代码、执行命令、解决任务。Goal 评估器是**独立的模型调用**，只做一件事：判断完成条件。

```python
class GoalEvaluator:
    def evaluate(self, goal: str, messages: list) -> dict:
        """独立的评估调用。"""
        response = client.chat.completions.create(
            model=EVAL_MODEL,  # 可以用更小/便宜的模型
            messages=[{
                "role": "user",
                "content": (
                    f"你是一个独立评估器。判断以下对话是否满足了目标。\n\n"
                    f"目标: {goal}\n\n"
                    f"对话摘要:\n{self.summarize(messages)}\n\n"
                    f"返回 JSON: {{\"ok\": true/false, \"reason\": \"...\"}}\n"
                    f"ok=true 表示目标已达成。ok=false 表示需要继续工作。\n"
                    f"如果任务不可能完成，加 \"impossible\": true。"
                ),
            }],
            max_tokens=500,
        )
        return json.loads(response.choices[0].message.content)
```

评估器看到：
- 活跃的 Goal 条件
- 到目前为止的对话
- 工作者放在对话中的工具结果

评估器**没有工具**，不能自己读文件或跑测试。它只能基于对话中已有的信息判断。

### 好的完成条件是可检查的

"让代码变好"太模糊。有用的条件说明三件事：

1. **终态**：工作完成时必须为真
2. **检查方式**：哪个命令或输出能证明
3. **约束**：过程中不能破坏什么

```
/goal 完成认证迁移，直到 pytest tests/auth 退出 0，
不修改 tests/auth 之外的测试文件
```

### 未完成的工作回到同一个循环

评估器返回未完成的原因：

```
对话中没有完整的测试结果。运行 pytest tests/auth 并报告退出码。
```

程序将原因追加到 messages[]，在当前 while 循环中执行 continue。主模型开始新一轮，无需等用户输入"继续"。

### 等待后台任务完成再评估

异步任务可能还在运行。立即评估会太早。Goal Stop 钩子返回 `defer`，跳过评估器。任务完成后，完成消息进入 messages，循环恢复。

### /goal 命令

| 命令 | 作用 |
|------|------|
| `/goal pytest 退出码 0` | 设置目标并立即开始工作 |
| `/goal` | 查看当前目标、评估次数、最新原因 |
| `/goal 新条件` | 替换目标 |
| `/goal clear` | 清除目标 |

### 自动继续仍需要出口

Goal 没有隐藏的默认轮数预算。但任何自动机制都不应永远占用一次请求。本课保持两个通用出口：

- 主循环的全局 `max_turns`
- 连续 Stop 钩子阻止次数的上限

达到限制时，程序把控制权还给用户——不标记目标完成，不清除目标。用户可以检查状态、提供更多信息、继续或清除目标。

---

## 完整代码（核心片段）

```python
import os, json, subprocess
from openai import OpenAI   # DeepSeek 兼容 OpenAI SDK，所以用 openai 包
from dotenv import load_dotenv

# 从 .env 文件加载环境变量
load_dotenv()

# ---- DeepSeek API 客户端初始化 ----
deepseek_client = OpenAI(api_key=os.getenv("DEEPSEEK_API_KEY"), base_url="https://api.deepseek.com")
MODEL = os.getenv("MODEL_ID", "deepseek-chat")       # 主模型名称
EVAL_MODEL = os.getenv("EVAL_MODEL_ID", MODEL)  # 评估器模型（可以用更小/便宜的模型）
SYSTEM = "你是编程助手。运行验证命令后，清楚地报告命令和结果。"
MAX_TURNS = int(os.getenv("MAX_TURNS", "50"))    # 最大循环轮数，防止无限循环

# ---- 基础工具（同前，简化）----
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
from pathlib import Path
WORKDIR = Path(".").resolve()  # 工作目录的绝对路径
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

# ---- Goal 评估器（s17 新增）：独立评估器 + Stop 钩子 + 自动继续 ----
class GoalController:
    """目标控制器：设置完成条件，每轮结束时独立评估是否达成。"""
    def __init__(self):
        self.goal = None
        self.eval_count = 0

    def set_goal(self, condition: str):
        self.goal = condition
        self.eval_count = 0
        print(f"\n[Goal 已设置] {condition}")

    def evaluate(self, messages) -> dict:
        """独立评估：目标是否达成？"""
        if not self.goal:
            return {"ok": True, "action": "stop"}
        self.eval_count += 1
        # 取最近对话的摘要
        recent = messages[-10:]
        summary = json.dumps(recent, ensure_ascii=False, default=str)[:3000]
        # 用独立的模型调用评估目标（评估器没有工具，只能看对话）
        response = deepseek_client.chat.completions.create(
            model=EVAL_MODEL,  # 评估器可以用更小/便宜的模型
            messages=[{"role": "user", "content":
                f"判断目标是否达成。\n目标: {self.goal}\n\n"
                f"最近对话:\n{summary}\n\n"
                f"返回 JSON: {{\"ok\": bool, \"reason\": str}}"}],
            max_tokens=300,
        )
        try:
            result = json.loads(response.choices[0].message.content)
        except:
            result = {"ok": True, "reason": "评估器解析失败"}

        if result.get("ok"):
            return {"action": "stop", "reason": "目标已达成"}
        if result.get("impossible"):
            return {"action": "stop", "reason": f"目标不可能完成: {result.get('reason','')}"}
        return {"action": "block", "reason": result.get("reason", "需要继续工作")}

    def clear(self):
        self.goal = None

GOAL = GoalController()

def agent_loop(messages):
    """核心循环：每结束时评估目标，未达成则自动继续。"""
    turn = 0
    while turn < MAX_TURNS:
        turn += 1
        # 调用 DeepSeek API
        response = deepseek_client.chat.completions.create(
            model=MODEL, messages=[{"role": "system", "content": SYSTEM}] + messages,
            tools=TOOLS, max_tokens=4096)
        msg = response.choices[0].message
        messages.append(msg)

        if not msg.tool_calls:
            # Goal 评估
            decision = GOAL.evaluate(messages)
            if decision["action"] == "block":
                print(f"\n[Goal 未达成] {decision['reason']}")
                messages.append({"role": "user", "content": decision["reason"]})
                continue
            print(f"\nAgent: {msg.content}")
            return
        for tc in msg.tool_calls:
            args = json.loads(tc.function.arguments)
            output = TOOL_HANDLERS[tc.function.name](**args)
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": output})
    print(f"\n[达到最大轮数 {MAX_TURNS}，返回控制权]")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        initial = sys.argv[1]
        if initial.startswith("/goal"):
            condition = initial[5:].strip()
            GOAL.set_goal(condition)
            messages = [{"role": "user", "content": f"请完成以下目标: {condition}"}]
        else:
            messages = [{"role": "user", "content": initial}]
    else:
        q = input("s17 >> ").strip()
        if q.startswith("/goal"):
            condition = q[5:].strip()
            GOAL.set_goal(condition)
            messages = [{"role": "user", "content": f"请完成以下目标: {condition}"}]
        else:
            messages = [{"role": "user", "content": q}]
    agent_loop(messages)
```

---

## 动手试一试

1. 运行 `python s17_goal_loop.py`，输入 `/goal python -m pytest 退出码为 0`
2. 观察 Agent 自动运行测试、修复问题、再次运行——直到评估器说 ok=true
3. 也可以从命令行直接设置：`python s17_goal_loop.py "/goal pytest 退出 0"`

**观察重点**：每轮结束时是否看到 `[Goal 未达成]` 日志？Agent 是否自动继续而无需用户输入？达到限制时是否把控制权还给用户？

---

## 常见坑

**坑 1：评估器被工作者"骗了"**
- 现象：工作者说"测试通过了"但实际没通过，评估器就信了
- 原因：评估器只看对话文本，不能自己验证
- 解决：评估器提示词明确要求"具体的工具结果"，不接受未经验证的声明

**坑 2：无限循环**
- 现象：Goal 永远不达成，Agent 一直跑
- 解决：设 `MAX_TURNS` 限制，达到后返回控制权

**坑 3：评估器解析 JSON 失败**
- 现象：评估器返回的不是有效 JSON
- 解决：加 try-except，失败时默认"继续"而非"完成"

---

## 与上一章的关系

s16 回答了"怎么做"——固定的编排写成代码。s17 回答"做完了吗"——独立评估器检查整个目标是否达成。工作流可能成功完成，但用户的最终需求仍未满足。工作流完成消息进入对话后，Goal 评估器决定是否需要另一轮。

---

## 课程总结：一句话回顾 17 章

```
s01  循环        一个 while True 让模型持续行动
s02  工具        加一个工具 = 加一行映射
s03  权限        先设边界，再给自由
s04  钩子        扩展挂在外面，循环保持稳定
s05  计划        先列步骤，再执行
s06  子代理      给子任务干净的上下文
s07  技能        用到才加载知识
s08  压缩        四步腾出上下文空间
s09  记忆        跨会话的选择性存储
s10  任务        持久化的目标和依赖图
s11  后台        慢操作不阻塞主循环
s12  定时        按时间表自动触发
s13  团队        多人分工，原子认领
s14  MCP         外部工具的 USB 接口
s15  集成        多种机制，一个循环
s16  工作流      固定编排写成代码
s17  目标        独立评估器决定何时停止
```

**课程的核心洞察**：一个真正可用的 Agent，不是"会聊天的模型"，而是**模型 + Harness + 约束 + 工具 + 记忆 + 协作**的系统。Harness 不给模型增加智能，而是给智能一个可以安全工作的环境。

---

## 速查表

| 概念 | 一句话解释 |
|------|-----------|
| /goal 命令 | 设置完成条件，立即开始工作 |
| Goal 评估器 | 独立的模型调用，判断目标是否达成 |
| Stop 钩子 | 模型想停止时，评估器先检查目标 |
| 自动继续 | 未达成时注入原因，循环自动继续 |
| MAX_TURNS | 安全阀，防止无限循环 |
| 可检查的条件 | 说明终态、检查方式和约束 |
