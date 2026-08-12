# s16: 工作流运行时 —— 固定的编排就写进代码

> "一次 tool_use 运行一整套编排" —— 工作流工具启动一个可恢复的脚本运行时，协调多次 Agent 调用。
> Harness 层：编排 —— 在单 Agent 循环之上运行保存的多 Agent 脚本。

---

## 问题引入

从 s01 到 s15，模型在每轮决定调用什么工具，结果进入 messages，模型再决定下一步。当路径依赖上一步的发现时，这种方式很有效。

但有些任务需要**固定的步骤序列**。代码审查可能要并行检查多个维度、验证每个发现、合并重复、排序结果。步骤和依赖在执行前就是已知的。

如果这种编排只存在于对话历史中，它的顺序和检查点也只存在于那段历史中。保存的工作流把固定序列写进代码，把已完成的调用记录在日志中。

**类比**：模型驱动的循环像即兴演奏——乐手根据现场情况决定下一个音符。工作流像交响乐谱——指挥按乐谱调度每个声部，每个乐章的顺序是固定的。

---

## 解决方案

在 s15 的工具池中添加一个 **Workflow 工具**。宿主注册由 `agent()`、`parallel()`、`pipeline()`、`phase()` 构建的可信脚本。模型只提供工作流名称、参数和可选的 runId（恢复用）；不发送可执行代码。

工作流作为一个 `tool_use` 进入主循环。脚本运行时发出生命周期事件，每步记录在磁盘日志中。脚本完成后返回结果。中间结果存在变量中，不占对话空间。用 `resume_from_run_id` 重启时，未变化的 `agent()` 调用命中日志缓存。

---

## 工作原理

### 编排原语

| 原语 | 作用 |
|------|------|
| `agent(prompt, {schema, label, phase})` | 委派一个子代理 |
| `parallel(thunks)` | 屏障：所有任务并行，等全部完成 |
| `pipeline(items, *stages)` | 每个 item 独立通过各阶段，无需等待 |
| `phase(title)` | 标记当前进度阶段 |
| `log(message)` | 发出进度日志 |

**pipeline vs parallel**：
- `pipeline` 适合每个 item 独立经过相同阶段。A 可能已到第 3 阶段，B 还在第 1 阶段。
- `parallel` 适合下一步需要前一组全部结果。

```python
async def pipeline(self, items, *stages):
    """每个 item 独立通过所有阶段。"""
    async def run_item(item, idx):
        value = item
        for stage in stages:  # 每个 item 独立完成所有阶段
            value = await stage(value, item, idx)
        return value
    return await asyncio.gather(*[run_item(it, i) for i, it in enumerate(items)])
```

### 结构化输出：不让子代理返回散文

```python
# agent({schema}) 要求子代理返回匹配 schema 的 JSON
run = await self.runner.run(prompt, schema, label)
result = run.value
if schema is not None:
    ok, err = validate(result, schema)
    if not ok:  # 不匹配则重试一次
        retry = await self.runner.run(
            prompt + "\n\n请返回有效的 JSON。", schema, label)
        result = retry.value
```

### 日志：快照 + 日志文件用于恢复

每次运行在 `.runtime/` 下创建：
- `<runId>.json` —— 快照
- `<runId>.output.json` —— 输出
- `<runId>.journal.jsonl` —— 日志（核心）

日志记录每个 `agent()` 的结果：

```python
class WorkflowJournal:
    def record(self, key, value):
        """记录一个 agent 调用的结果。"""
        self._f.write(json.dumps({"key": key, "value": value}) + "\n")
        self._f.flush()
        self.cache[key] = value
```

### 恢复：按 runId 继续，未变化的命中缓存

```python
def key(self, kind, label, prompt, schema):
    """稳定的调用键——基于内容而非完成顺序。"""
    basis = f"{kind}|{label}|{prompt}|{json.dumps(schema, sort_keys=True)}"
    return f"{kind}-{hash(basis) % 10**10:010d}"

# agent() 内部：
cached = self.journal.cached(key)
if cached is not MISS:
    return cached  # 命中缓存，不重新执行
```

**为什么用内容哈希而非序号**：parallel 和 pipeline 中的 agent 完成顺序不确定。如果用"第 n 个完成的"作为键，恢复时缓存会映射到错误的调用。

### 示例工作流：代码审查

```python
async def review_changes(ctx, args):
    changes = args.get("changes", "")

    ctx.phase("审查")
    async def audit(_v, dimension, _i):
        out = await ctx.agent(
            f"检查以下变更的 {dimension} 问题:\n{changes}",
            schema={"findings": []}, label=f"audit:{dimension}")
        return {"dimension": dimension, "findings": out["findings"]}

    async def verify(audited, dimension, _i):
        ctx.phase("验证")
        verdicts = await ctx.parallel([
            (lambda f=f: ctx.agent(
                f"验证此发现:\n{changes}\n\n{f}",
                schema={"isReal": True},
                label=f"verify:{dimension}:{f['title']}"))
            for f in audited["findings"]
        ])
        return {
            "dimension": dimension,
            "confirmed": [f for f, v in zip(audited["findings"], verdicts) if v["isReal"]]
        }

    results = await ctx.pipeline(DIMENSIONS, audit, verify)
    confirmed = [f for r in results if r for f in r["confirmed"]]
    return {"confirmed": confirmed}
```

---

## 完整代码（核心片段）

```python
import os, json, asyncio, hashlib
from openai import OpenAI   # DeepSeek 兼容 OpenAI SDK，所以用 openai 包
from dotenv import load_dotenv

# 从 .env 文件加载环境变量
load_dotenv()

# ---- DeepSeek API 客户端初始化 ----
deepseek_client = OpenAI(api_key=os.getenv("DEEPSEEK_API_KEY"), base_url="https://api.deepseek.com")
MODEL = os.getenv("MODEL_ID", "deepseek-chat")  # 模型名称

# ---- 工作流运行时（s16 新增）：pipeline/parallel/agent 编排原语 + Journal 日志恢复 ----
class WorkflowJournal:
    """工作流日志：记录每个 agent 调用的结果，支持恢复时命中缓存。"""
    def __init__(self, path):
        self.path = path; self.cache = {}
        self._f = open(path, "a")
    def record(self, key, value):
        self._f.write(json.dumps({"key": key, "value": value}) + "\n")
        self._f.flush(); self.cache[key] = value
    def cached(self, key):
        return self.cache.get(key, "MISS")
    def close(self): self._f.close()

class ExecutionContext:
    """执行上下文：提供 agent/parallel/pipeline 等编排原语。"""
    def __init__(self, journal):
        self.journal = journal; self.runner_count = 0
    def phase(self, title): print(f"  阶段: {title}")
    def log(self, msg): print(f"  日志: {msg}")

    async def agent(self, prompt, schema=None, label="", phase=None):
        """运行一个子代理，支持缓存。"""
        key = f"agent-{hashlib.md5(f'{label}|{prompt}'.encode()).hexdigest()[:10]}"
        cached = self.journal.cached(key)
        if cached != "MISS":
            print(f"  [缓存命中] {label}"); return cached
        self.runner_count += 1
        # 调用 DeepSeek API 执行子代理
        resp = deepseek_client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
        )
        result = json.loads(resp.choices[0].message.content) if schema else resp.choices[0].message.content
        self.journal.record(key, result)
        return result

    async def parallel(self, thunks):
        return await asyncio.gather(*[t() for t in thunks])

    async def pipeline(self, items, *stages):
        async def run_item(item, idx):
            v = item
            for stage in stages: v = await stage(v, item, idx)
            return v
        return await asyncio.gather(*[run_item(it, i) for i, it in enumerate(items)])

# 运行工作流
async def run_workflow(name, args=None, resume_id=None):
    from pathlib import Path
    run_id = resume_id or f"run_{hashlib.md5(name.encode()).hexdigest()[:8]}"
    runtime_dir = Path(".runtime"); runtime_dir.mkdir(exist_ok=True)
    journal = WorkflowJournal(runtime_dir / f"{run_id}.journal.jsonl")
    ctx = ExecutionContext(journal)
    print(f"工作流: {name} (runId: {run_id})")
    result = await WORKFLOWS[name](ctx, args or {})
    journal.close()
    print(f"完成: {ctx.runner_count} 次 Agent 调用")
    return {"run_id": run_id, "result": result}

WORKFLOWS = {"review-changes": review_changes}  # 注册工作流

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "resume":
        run_id = input("输入要恢复的 runId: ").strip()
        result = asyncio.run(run_workflow("review-changes", {"changes": "sample diff"}, run_id))
    else:
        result = asyncio.run(run_workflow("review-changes", {"changes": "sample diff"}))
    print(json.dumps(result, ensure_ascii=False, indent=2))
```

---

## 动手试一试

1. 运行 `python s16_workflow_runtime.py`，观察 pipeline 的进度事件
2. 运行 `python s16_workflow_runtime.py resume`，输入上次的 runId，观察缓存命中
3. 确认恢复时 `agent 调用数 = 0`（全部命中缓存）

---

## 常见坑

**坑 1：恢复时键不稳定**
- 现象：相同代码恢复后没有命中缓存
- 原因：用完成顺序而非内容作为键
- 解决：用调用内容（label+prompt+schema）的稳定哈希

**坑 2：子代理返回散文而非 JSON**
- 现象：下游代码解析 JSON 失败
- 解决：用 schema 约束输出，不匹配时重试一次

---

## 与上一章的关系

s15 把所有机制装进了一个运行时。s16 在其上添加了一个**工作流工具**——把固定的编排逻辑写成代码，而不是让模型每轮即兴决定。

---

## 下一章预告

工作流回答了"怎么做"。但还有一个问题：**"做完了吗？"** 模型停止调用工具只意味着当前轮结束了，不意味着整个目标达成了。

**下一章 s17**：目标循环——独立的评估器决定循环何时可以停止。

---

## 速查表

| 概念 | 一句话解释 |
|------|-----------|
| Workflow 工具 | 一次 tool_use 运行整套编排 |
| agent() | 委派子代理，支持结构化输出和缓存 |
| parallel | 屏障：全部完成后继续 |
| pipeline | 每个 item 独立通过各阶段 |
| Journal | 日志文件，记录每步结果用于恢复 |
| 稳定键 | 基于内容哈希，不依赖完成顺序 |
