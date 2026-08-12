# s07: 技能加载 —— 按需加载知识，不要一开始全塞进去

> 系统提示词包含技能目录；load_skill 返回完整的 SKILL.md。
> Harness 层：知识加载 —— 让模型知道有哪些技能可用，需要时再加载全文。

---

## 问题引入

假设项目有 React 组件规范、SQL 风格指南、API 设计文档。想让 Agent 开发时遵循这些规则，最直接的做法是全塞进系统提示词：

```python
SYSTEM = (
    f"你是编程助手。"
    + open("docs/react-style.md").read()
    + open("docs/sql-style.md").read()
    + open("docs/api-design.md").read()
)
```

问题是：**三份文档永远在系统提示词里**，即使当前任务只改 React 组件。SQL 指南和 API 文档白白消耗 token 和上下文空间。

**类比**：你的书架上有 50 本书。你不会把所有书都摊在桌上——你只需要当前用到的那一两本。技能加载就是"看到书名，用到再拿"。

---

## 解决方案

启动时，SkillLoader 扫描 `skills/*/SKILL.md`，只读取名称和描述加入系统提示词。模型需要完整指令时，调用 `load_skill(name)` 获取全文。

| 内容 | 模型输入 | 加载时机 |
|------|---------|---------|
| 技能名称和描述 | 系统提示词 | 启动时 |
| 完整 SKILL.md | 工具结果 | 调用 load_skill 时 |

---

## 工作原理

### 技能目录结构

```
skills/
  agent-builder/SKILL.md
  code-review/SKILL.md
  mcp-builder/SKILL.md
  pdf/SKILL.md
```

每个 SKILL.md 包含 YAML 头：

```yaml
---
name: code-review
description: 执行全面的代码审查...
---

# Code Review 技能

## 审查标准
...
```

### SkillLoader：扫描和加载

```python
class SkillLoader:
    def __init__(self, skills_dir=Path("skills")):
        self.skills_dir = skills_dir
        self.skills = {}

    def scan(self):
        """启动时扫描所有技能，只读名称和描述。"""
        for manifest in sorted(self.skills_dir.glob("*/SKILL.md")):
            content = manifest.read_text()
            # 解析 YAML frontmatter
            meta, body = self.parse_frontmatter(content)
            name = meta.get("name", manifest.parent.name)
            desc = meta.get("description", body.splitlines()[0])
            self.skills[name] = {
                "name": name,
                "description": desc,
                "content": content,
            }

    def catalog(self) -> str:
        """返回技能目录（只有名称和描述）。"""
        return "\n".join(
            f"- {s['name']}: {s['description']}"
            for s in self.skills.values()
        )

    def load(self, name: str) -> str:
        """按需加载完整技能内容。"""
        skill = self.skills.get(name)
        if skill:
            return skill["content"]
        available = ", ".join(self.skills) or "无"
        return f"错误：未知技能 '{name}'。可用: {available}"

    def parse_frontmatter(self, content):
        """简单的 YAML frontmatter 解析。"""
        if content.startswith("---"):
            parts = content.split("---", 2)
            meta = {}
            for line in parts[1].strip().splitlines():
                if ": " in line:
                    k, v = line.split(": ", 1)
                    meta[k.strip()] = v.strip()
            return meta, parts[2] if len(parts) > 2 else ""
        return {}, content

SKILL_LOADER = SkillLoader()
SKILL_LOADER.scan()
```

### 系统提示词只包含目录

```python
def build_system_prompt() -> str:
    return (
        f"你是编程助手，工作目录 {WORKDIR}。使用工具完成任务。\n\n"
        f"可用技能:\n{SKILL_LOADER.catalog()}\n\n"
        "当技能适用时，使用 load_skill 读取完整指令。"
    )
```

### load_skill 作为工具

```python
def run_load_skill(name: str) -> str:
    """按需加载技能全文。"""
    return SKILL_LOADER.load(name)

LOAD_SKILL_TOOL = {
    "type": "function",
    "function": {
        "name": "load_skill",
        "description": "加载技能的完整指令。",
        "parameters": {"type": "object", "properties": {
            "name": {"type": "string"}}, "required": ["name"]},
    },
}

TOOL_HANDLERS["load_skill"] = run_load_skill
```

---

## 完整代码（核心片段）

```python
import os, json, subprocess
from pathlib import Path
from openai import OpenAI   # DeepSeek 兼容 OpenAI SDK，所以用 openai 包
from dotenv import load_dotenv

# 从 .env 文件加载环境变量
load_dotenv()

# ---- DeepSeek API 客户端初始化 ----
deepseek_client = OpenAI(api_key=os.getenv("DEEPSEEK_API_KEY"), base_url="https://api.deepseek.com")
MODEL = os.getenv("MODEL_ID", "deepseek-chat")  # 模型名称
WORKDIR = Path(".").resolve()                    # 工作目录的绝对路径

# ---- 技能加载器（s07 新增）：按需加载知识，目录在系统提示词，全文通过 load_skill 获取 ----
class SkillLoader:
    """技能加载器：扫描技能目录，按需加载完整指令。"""
    def __init__(self, skills_dir=Path("skills")):
        self.skills_dir = skills_dir; self.skills = {}
    def scan(self):
        if not self.skills_dir.exists(): return
        for f in sorted(self.skills_dir.glob("*/SKILL.md")):
            content = f.read_text()
            meta = {}
            if content.startswith("---"):
                for line in content.split("---", 2)[1].strip().splitlines():
                    if ": " in line: k, v = line.split(": ", 1); meta[k.strip()] = v.strip()
            name = meta.get("name", f.parent.name)
            self.skills[name] = {"name": name, "description": meta.get("description", ""), "content": content}
    def catalog(self):
        return "\n".join(f"- {s['name']}: {s['description']}" for s in self.skills.values()) or "无可用技能"
    def load(self, name):
        s = self.skills.get(name)
        return s["content"] if s else f"未知技能 '{name}'。可用: {', '.join(self.skills) or '无'}"

SKILL_LOADER = SkillLoader(); SKILL_LOADER.scan()
SYSTEM = f"你是编程助手，工作目录 {WORKDIR}。\n\n可用技能:\n{SKILL_LOADER.catalog()}\n\n需要时用 load_skill 加载完整指令。"

TOOLS = [
    {"type": "function", "function": {"name": "bash", "description": "执行命令",
        "parameters": {"type": "object", "properties": {"command": {"type": "string"}}, "required": ["command"]}}},
    {"type": "function", "function": {"name": "read_file", "description": "读取文件",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}}},
    {"type": "function", "function": {"name": "write_file", "description": "写入文件",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]}}},
    {"type": "function", "function": {"name": "load_skill", "description": "加载技能完整指令",
        "parameters": {"type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"]}}},
]

# ---- 工具实现 ----
def run_bash(c): return subprocess.run(c, shell=True, capture_output=True, text=True, timeout=30).stdout or "(无输出)"
def run_read(p): return (WORKDIR / p).read_text()
def run_write(p, c): (WORKDIR / p).write_text(c); return f"已写入 {len(c)} 字节"
def run_load_skill(name): return SKILL_LOADER.load(name)  # 加载技能全文

# ---- 工具分发表（新增 load_skill）----
TOOL_HANDLERS = {"bash": run_bash, "read_file": run_read, "write_file": run_write, "load_skill": run_load_skill}

def agent_loop(messages):
    """核心循环：系统提示词中包含技能目录，模型可按需加载。"""
    while True:
        # 调用 DeepSeek API
        response = deepseek_client.chat.completions.create(
            model=MODEL, messages=[{"role": "system", "content": SYSTEM}] + messages,
            tools=TOOLS, max_tokens=4096)
        msg = response.choices[0].message; messages.append(msg)
        if not msg.tool_calls:
            print(f"\nAgent: {msg.content}"); return
        for tc in msg.tool_calls:
            args = json.loads(tc.function.arguments)
            output = TOOL_HANDLERS[tc.function.name](**args)
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": output})

if __name__ == "__main__":
    q = input("s07 >> ").strip()
    agent_loop([{"role": "user", "content": q}])
```

---

## 动手试一试

1. 输入"有哪些可用技能？"
2. 输入"加载 code-review 技能并按其指令审查 README.md"
3. 确认系统提示词只包含目录，完整 SKILL.md 在 load_skill 调用后才出现

---

## 常见坑

**坑 1：技能太多导致目录过长**
- 现象：系统提示词中的技能目录占了很多 token
- 解决：分类技能，只展示相关类别

**坑 2：模型不主动调用 load_skill**
- 现象：模型知道有技能但不加载
- 解决：在系统提示词中明确说"当技能适用时，先加载"

---

## 与上一章的关系

s06/s08 解决了上下文空间管理。s07 解决的是"知识按需加载"——不是一开始就把所有文档塞进去，而是用到才加载。

---

## 下一章预告

技能是人工编写的、只读的知识。MCP 插件则让 Agent 能**连接外部工具和服务**——Jira、部署平台、知识库都能通过统一协议接入。

**下一章 s14**：MCP 插件——连接外部工具到同一个能力池。

---

## 速查表

| 概念 | 一句话解释 |
|------|-----------|
| SKILL.md | 技能文件，包含 YAML 头和完整指令 |
| SkillLoader.scan | 启动时扫描，只读名称和描述 |
| catalog | 技能目录，加入系统提示词 |
| load_skill | 按需加载完整技能内容 |
| 按需加载 | 用到才加载，不用不占上下文 |
