# s15: 集成 Harness —— 多种机制，一个循环

> "多种机制，一个循环" —— 工具、权限、记忆、任务、团队、插件全部挂在同一个 while True 上。
> Harness 层：集成 —— 把本课程用到的所有机制放进一个可运行的系统。

---

## 问题引入

前面的章节把各个机制分开讲解，每章一个可运行的例子。但一个真正可用的编码 Agent 需要**同时**用到所有这些：

- 工具分发和权限边界
- 钩子扩展点
- 任务规划和任务图
- 技能、记忆和运行时系统提示词组装
- 上下文压缩和错误恢复
- 后台任务和定时调度
- 团队、协议和 IDLE 任务认领
- 任务绑定的工作树
- MCP 外部工具集成

s15 不引入新机制。它展示的是**现有机制在循环中的位置**以及**它们的事件如何回到同一个对话**。

**类比**：前面 14 章就像汽车工厂的各个车间——发动机车间、变速箱车间、车身车间。s15 是总装线——把所有零件装到一辆车上，让它跑起来。

---

## 解决方案：事件流全景

```
用户输入
→ UserPromptSubmit 钩子
→ cron/后台通知注入
→ 上下文压缩
→ 记忆 + 技能 + MCP 状态组装系统提示词
→ LLM
→ 有 tool_use 块吗？
  否 → Stop 钩子 → 返回
  是 → PreToolUse 钩子 + 权限
     → TOOL_HANDLERS / MCP 处理 / 后台分发
     → PostToolUse 钩子
     → tool_result 回到 messages
     → 下一轮
```

---

## 各组件在循环中的位置

| 位置 | 组件 | 作用 |
|------|------|------|
| 用户输入周围 | UserPromptSubmit 钩子 | 日志、注入、审计 |
| LLM 之前 | cron 队列 | 注入定时提示词 |
| LLM 之前 | 后台通知 | 注入已完成的后台结果 |
| LLM 之前 | 压缩管道 | 预算大输出、裁剪历史、压缩旧结果、需要时总结 |
| LLM 之前 | 记忆/技能/MCP | 组装系统提示词 |
| LLM 调用 | 错误恢复 | 429/529 重试、max_tokens 升级、prompt-too-long 压缩 |
| 工具执行前 | PreToolUse 钩子 + 权限 | 阻止危险命令、越界写入 |
| 工具分发 | assemble_tool_pool | 组装内置 + MCP 工具 |
| 工具执行中 | 后台分发 | 标记的 bash 走后台 |
| 工具执行后 | PostToolUse 钩子 | 大输出警告、日志 |
| 回到循环 | tool_result | 每个 tool_use 一个 tool_result |
| 无 tool_use / 退出时 | Stop 钩子 | 统计、清理、审计 |

---

## 25 个内置工具

```
bash, read_file, write_file, edit_file, glob
todo_write, task, load_skill, compact
create_task, list_tasks, get_task, claim_task, complete_task
schedule_cron, list_crons, cancel_cron
spawn_teammate, list_teammates, send_message
request_shutdown, request_plan, review_plan
create_worktree
connect_mcp
```

每轮通过 `assemble_tool_pool()` 组装：内置工具 + 已连接的 MCP 工具。

---

## 两种规划层

| 层 | 工具 | 作用域 | 存储 |
|----|------|--------|------|
| 轻量规划 | todo_write | 当前会话 | 内存 |
| 任务图 | create_task 系列 | 跨会话 | .tasks/*.json |

todo_write 防止单个 Agent 迷失方向。任务图支持团队协作。

## 两种委派方式

| 方式 | 工具 | 用途 |
|------|------|------|
| 一次性子代理 | task | 上下文隔离，只返回结论 |
| 持久化队友 | spawn_teammate | 长期并行协作 |

---

## 记忆、技能与提示词组装

```python
def assemble_system_prompt(context):
    """运行时组装系统提示词。"""
    parts = [
        f"你是编程助手，工作目录 {WORKDIR}。",
        f"\n可用技能:\n{SKILL_LOADER.catalog()}",
    ]
    # 注入相关记忆
    if context.get("memories"):
        parts.append(f"\n背景知识:\n{chr(10).join(context['memories'])}")
    # 注入 MCP 状态
    if mcp_clients:
        parts.append(f"\n已连接 MCP: {', '.join(mcp_clients)}")
    return "\n".join(parts)
```

每轮调用前：读 `.memory/MEMORY.md` 目录 → 选择相关记录 → 注入系统提示词。

---

## 压缩与错误恢复

```python
# LLM 调用前：运行压缩管道
messages[:] = COMPACTOR.prepare(messages, active_request)

# LLM 调用包装错误恢复
try:
    response = client.chat.completions.create(...)
except Exception as error:
    msg = str(error).lower()
    if "rate" in msg or "429" in msg:
        time.sleep(backoff)  # 指数退避重试
        continue
    if "too long" in msg or "too many tokens" in msg:
        messages[:] = COMPACTOR.reactive_compact(messages, active_request)
        continue
    raise
```

---

## 完整代码（核心结构）

```python
import os, json, subprocess, threading, time
from pathlib import Path
from openai import OpenAI   # DeepSeek 兼容 OpenAI SDK，所以用 openai 包
from dotenv import load_dotenv

# 从 .env 文件加载环境变量
load_dotenv()

# ---- DeepSeek API 客户端初始化 ----
deepseek_client = OpenAI(api_key=os.getenv("DEEPSEEK_API_KEY"), base_url="https://api.deepseek.com")
MODEL = os.getenv("MODEL_ID", "deepseek-chat")  # 模型名称
WORKDIR = Path(".").resolve()                    # 工作目录的绝对路径

# ---- 集成 Harness 的核心循环 ----
# （各组件的实现在前面各章中已详细讲解，此处展示集成点）

HOOKS = {"UserPromptSubmit": [], "PreToolUse": [], "PostToolUse": [], "Stop": []}  # 四个扩展点
def register_hook(e, cb): HOOKS[e].append(cb)  # 注册钩子
def trigger_hooks(e, *a):
    """触发指定事件的所有钩子。"""
    for cb in HOOKS[e]:
        r = cb(*a)
        if r is not None: return r
    return None

# ---- 权限钩子（拒绝危险命令、MCP 工具需确认）----
DENY_LIST = ["rm -rf /", "sudo", "shutdown"]  # 拒绝清单
def permission_hook(name, args):
    if name == "bash":
        for p in DENY_LIST:
            if p in args.get("command", ""): return f"⛔ {p}"
    if name.startswith("mcp__"):
        parts = name.split("__")
        if input(f"  MCP {name} 需确认 [y/N] ").strip().lower() != "y":
            return "MCP 权限被拒绝"
    return None
register_hook("PreToolUse", permission_hook)

# ---- 日志钩子（记录每次工具调用）----
def log_hook(name, args):
    print(f"\033[90m[钩子] {name}\033[0m")
    return None
register_hook("PreToolUse", log_hook)

def assemble_system():
    """运行时组装系统提示词。"""
    parts = [f"你是集成 Agent，工作目录 {WORKDIR}。"]
    parts.append("可用工具: bash, read_file, write_file, edit_file, glob,")
    parts.append("  todo_write, task, load_skill, compact,")
    parts.append("  create_task, list_tasks, claim_task, complete_task,")
    parts.append("  schedule_cron, list_crons, cancel_cron,")
    parts.append("  spawn_teammate, send_message, connect_mcp")
    return "\n".join(parts)

def agent_loop(messages, active_request=""):
    """集成 Agent 循环——所有机制共享同一个 while True。"""
    while True:
        # 1. 注入后台结果和 cron 通知（此处简化）
        # 2. 上下文压缩（s08）
        # 3. 组装系统提示词（记忆+技能+MCP）
        system = assemble_system()

        # 4. 调用 DeepSeek API（带错误恢复）
        try:
            response = deepseek_client.chat.completions.create(
                model=MODEL,
                messages=[{"role": "system", "content": system}] + messages,
                tools=TOOLS, max_tokens=4096,
            )
        except Exception as e:
            if "rate" in str(e).lower():
                time.sleep(2); continue
            raise

        msg = response.choices[0].message
        messages.append(msg)

        # 5. 无工具调用 → Stop 钩子 → 退出
        if not msg.tool_calls:
            force = trigger_hooks("Stop", messages)
            if force:
                messages.append({"role": "user", "content": force}); continue
            print(f"\nAgent: {msg.content}"); return

        # 6. 执行工具
        for tc in msg.tool_calls:
            args = json.loads(tc.function.arguments)
            # PreToolUse
            blocked = trigger_hooks("PreToolUse", tc.function.name, args)
            if blocked:
                messages.append({"role": "tool", "tool_call_id": tc.id, "content": str(blocked)}); continue
            # 工具分发
            handler = TOOL_HANDLERS.get(tc.function.name)
            output = handler(**args) if handler else f"未知: {tc.function.name}"
            # PostToolUse
            trigger_hooks("PostToolUse", tc.function.name, args, output)
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": output})
```

---

## 动手试一试

1. "查看本仓库，告诉我哪些 Python 文件最重要"
2. "连接 docs MCP 服务端，搜索 agent loop 相关内容"
3. "后台安装依赖，同时读 README.md"
4. "3 分钟后提醒我开会"
5. "并行重构认证模块和登录页面，用工作树隔离，编辑前先给我看计划"

**观察重点**：每次工具调用是否经过钩子/权限？MCP 工具是否在 connect 后出现？后台任务是否返回占位结果？cron 是否到时自动提醒？

---

## 常见坑

**坑 1：事件注入顺序错误**
- 现象：cron 通知在压缩之后注入，结果被压缩掉了
- 解决：注入（cron/后台/团队事件）→ 压缩 → LLM 调用，严格顺序

**坑 2：25 个工具让模型困惑**
- 现象：模型选错工具或生成不存在的工具名
- 解决：清晰的工具描述、合理的命名约定

---

## 与前面各章的关系

s15 不引入新机制。它是一张**集成图**——展示 s01-s14 的所有组件如何在同一个运行时中协作。

| 章节 | 在 s15 中的角色 |
|------|----------------|
| s01 循环 | 核心 while True |
| s02 工具 | 25 个内置工具 + MCP 工具 |
| s03 权限 | PreToolUse 钩子 |
| s04 钩子 | 四个扩展点 |
| s05 计划 | todo_write |
| s06 子代理 | task 工具 |
| s07 技能 | 目录在系统提示词，按需加载 |
| s08 压缩 | 每轮 LLM 调用前 |
| s09 记忆 | 系统提示词组装 |
| s10 任务 | create_task 系列 |
| s11 后台 | 后台分发 |
| s12 定时 | cron 队列 |
| s13 团队 | 队友运行时 |
| s14 MCP | 动态工具池 |

---

## 下一章预告

s15 把所有机制装进了一辆车。接下来两章关注两个高级问题：**如何把固定的编排流程写成代码**（s16），以及**如何让独立评估器决定循环何时停止**（s17）。

---

## 速查表

| 概念 | 一句话解释 |
|------|-----------|
| 集成 Harness | 所有机制共享同一个 while True 循环 |
| 25 个工具 | 涵盖基础操作、规划、任务、团队、MCP |
| 事件流 | 输入→钩子→压缩→组装→LLM→权限→分发→结果→下一轮 |
| 两种规划 | todo_write（轻量）+ 任务图（持久化） |
| 两种委派 | task（一次性）+ spawn_teammate（持久化） |
