# s06: 子代理 —— 给子任务一个全新的上下文

> 子代理从一个全新的 messages[] 开始。它的最终文本作为工具结果返回给父级；中间对话不会。
> Harness 层：委派 —— 在独立的对话上下文中运行一个聚焦的任务。

---

## 问题引入

Agent 在修一个 bug。它读了很多文件来追踪调用链，每次工具调用和结果都留在父级的 messages[] 里。一旦调用链搞清楚了，大部分中间细节就不再需要了，但它们仍然占据着上下文空间。

**类比**：你让助手去查一个技术问题。助手翻了 20 页资料才找到答案。你不需要助手把 20 页资料全搬回来——你只需要结论。让助手带着一个空白的笔记本出发，查完后只把结论抄在你的主笔记本上。

---

## 解决方案

调用 `task` 工具会同步运行一个**嵌套的 Agent 循环**，使用全新的 messages[]。当嵌套循环结束时，它的最终文本变成父对话中的工具结果。

这是**消息隔离**，不是进程或文件系统隔离。父级和子代理在同一个 Python 进程中运行，共享 WORKDIR。

| 决策 | 选择 | 原因 |
|------|------|------|
| 对话 | 全新的 messages[] | 父级历史不复制到子代理 |
| 执行 | 同进程、同 WORKDIR | 文件变更双方可见 |
| 返回值 | 仅最终文本 | 子级工具调用和结果不复制到父级 |
| 委派深度 | 子级无 task 工具 | 只允许一层委派 |

---

## 工作原理

### run_subagent：创建新消息列表，运行嵌套循环

```python
SUB_TOOLS = list(BASE_TOOLS)  # 不包含 task 工具，防止嵌套委派

SUB_SYSTEM = "你是一个子代理。完成指定任务后，给出简明结论。"

def run_subagent(prompt: str) -> str:
    """启动一个子代理，返回其最终文本。"""
    messages = [{"role": "user", "content": prompt}]  # 全新的消息列表

    for _ in range(30):  # 最多 30 轮
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "system", "content": SUB_SYSTEM}] + messages,
            tools=SUB_TOOLS,
            max_tokens=4096,
        )
        msg = response.choices[0].message
        messages.append(msg)

        # 没有工具调用 → 子代理说完了，返回最终文本
        if not msg.tool_calls:
            return msg.content or "(无结论)"

        # 执行工具调用
        results = []
        for tc in msg.tool_calls:
            handler = SUB_HANDLERS.get(tc.function.name)
            args = json.loads(tc.function.arguments)
            output = handler(**args) if handler else f"未知: {tc.function.name}"
            results.append({"role": "tool", "tool_call_id": tc.id, "content": output})
        messages.extend(results)

    return "子代理在 30 轮后仍未给出最终答案。"
```

### 主 Agent 像使用其他工具一样调用它

```python
TASK_TOOL = {
    "type": "function",
    "function": {
        "name": "task",
        "description": "运行一个子代理，返回其最终文本。适合需要大量中间步骤的子任务。",
        "parameters": {
            "type": "object",
            "properties": {"prompt": {"type": "string", "description": "子任务描述"}},
            "required": ["prompt"],
        },
    },
}

TOOLS = [*BASE_TOOLS, TASK_TOOL]
TOOL_HANDLERS = {**BASE_HANDLERS, "task": run_subagent}
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
SYSTEM = f"你是一个编程助手，工作目录是 {WORKDIR}。可以用 task 工具委派子任务。"
SUB_SYSTEM = "你是一个子代理。完成任务后给出简明结论。"  # 子代理的系统提示词

# ---- 基础工具定义（主 Agent 和子代理共用）----
BASE_TOOLS = [
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

# ---- task 工具定义（s06 新增）：启动子代理，传入任务提示词 ----
TASK_TOOL = {"type": "function", "function": {"name": "task", "description": "运行子代理并返回最终文本",
    "parameters": {"type": "object", "properties": {"prompt": {"type": "string"}}, "required": ["prompt"]}}}

# 主 Agent 的工具池 = 基础工具 + task 工具
TOOLS = [*BASE_TOOLS, TASK_TOOL]

# ---- 工具实现 ----
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

# 基础工具分发表（子代理也用这个，没有 task 工具）
BASE_HANDLERS = {"bash": run_bash, "read_file": run_read, "write_file": run_write,
                 "edit_file": run_edit, "glob": run_glob}
SUB_HANDLERS = dict(BASE_HANDLERS)  # 子代理只有基础工具，不能嵌套委派

# ---- 子代理（s06 新增）：全新 messages[]，消息隔离 ----
def run_subagent(prompt: str) -> str:
    """启动一个子代理，在独立的上下文中完成任务，只返回结论。"""
    # ★ 关键：全新的 messages，不继承父级历史（消息隔离）
    messages = [{"role": "user", "content": prompt}]
    print(f"\n[子代理启动] {prompt[:60]}...")
    for i in range(30):  # 最多 30 轮，防止无限循环
        response = deepseek_client.chat.completions.create(
            model=MODEL, messages=[{"role": "system", "content": SUB_SYSTEM}] + messages,
            tools=BASE_TOOLS, max_tokens=4096)
        msg = response.choices[0].message
        messages.append(msg)
        if not msg.tool_calls:  # 子代理不调用工具 = 完成
            print(f"[子代理完成] 经过 {i+1} 轮")
            return msg.content or "(无结论)"  # 只返回最终文本给主 Agent
        # 执行子代理的工具调用
        for tc in msg.tool_calls:
            args = json.loads(tc.function.arguments)
            handler = SUB_HANDLERS.get(tc.function.name)
            output = handler(**args) if handler else f"未知: {tc.function.name}"
            print(f"  [sub] {tc.function.name}(...)")  # 子代理的调用日志以 [sub] 前缀
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": output})
    return "子代理在 30 轮后未给出最终答案。"  # 超过最大轮数

# 主 Agent 的分发表 = 基础工具 + task 工具
TOOL_HANDLERS = {**BASE_HANDLERS, "task": run_subagent}

def agent_loop(messages):
    """主 Agent 循环：与 s02 相同，只是工具池多了 task。"""
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
            # 如果是 task 工具，会启动子代理；否则执行基础工具
            output = TOOL_HANDLERS[tc.function.name](**args)
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": output})

if __name__ == "__main__":
    query = input("s06 >> ").strip()
    agent_loop([{"role": "user", "content": query}])
```

---

## 动手试一试

1. 输入"用子任务查找当前项目用了什么测试框架"（子 Agent 读文件，主 Agent 只收到结论）
2. 输入"委派一个子任务：读 agents/ 目录下所有 .py 文件并总结每个文件的作用"
3. 输入"用子任务创建一个 string_tools.py，包含 slugify 函数，然后从主 Agent 验证"

**观察重点**：是否出现 `[子代理启动]` / `[子代理完成]`？子代理的工具调用是否以 `[sub]` 显示？主 Agent 是否只收到最终文本？

---

## 常见坑

**坑 1：子代理上下文泄漏**
- 现象：子代理"知道"了不该知道的信息
- 原因：父级历史被复制到了子代理的 messages[]
- 解决：子代理必须从全新的 `messages = [{"role": "user", "content": prompt}]` 开始

**坑 2：子代理无限循环**
- 现象：子代理跑了很久也不停
- 原因：没有轮数限制
- 解决：设置 `for _ in range(30)` 的最大轮数限制

---

## 与上一章的关系

s05 让 Agent 能列计划。但计划中的某些步骤可能本身就很复杂——读几十个文件、做大量中间分析。s06 让这些步骤**在独立的上下文中完成**，只把结论带回主对话。

---

## 下一章预告

Agent 现在能把任务拆开了。但不同任务需要不同的知识：编辑前端组件需要 React 规范，写 SQL 需要表结构。把所有知识都塞进系统提示词会撑爆上下文。

**下一章 s08**（跳过 s07，因为 s07 技能加载是扩展主题）：随着工具调用累积，messages[] 会越来越长。s08 讲解如何压缩上下文，让 Agent 在长对话中仍然高效。

---

## 速查表

| 概念 | 一句话解释 |
|------|-----------|
| task 工具 | 启动子代理的入口，像其他工具一样被调用 |
| 消息隔离 | 子代理从全新的 messages[] 开始，不继承父级历史 |
| 仅返回最终文本 | 子代理的中间工具调用和结果不会回到父级 |
| 一层委派 | 子代理没有 task 工具，不能再委派下级 |
