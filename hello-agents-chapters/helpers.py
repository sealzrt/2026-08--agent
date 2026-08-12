"""
Hello-Agents 课程共享辅助函数模块
=================================
本模块提供各章节代码中使用的通用辅助函数，包括：
- LLM 调用封装（llm_call）
- 工具执行（execute_tool）
- 文本解析（parse_action, parse_plan）
- 记忆管理（save_to_memory）
- Token 计数与摘要（count_tokens, summarize）
- MCP 工具调用（mcp_call）
- 链路追踪（save_trace）

使用方式：
  将本文件放在项目根目录，在各章节代码中 import 即可：
    from helpers import llm_call, execute_tool, parse_action, ...

依赖安装：
  pip install openai python-dotenv tiktoken
"""

import json
import os
import re
import time
from openai import OpenAI
from dotenv import load_dotenv

# ============================================================
# 初始化 LLM 客户端（所有章节共用）
# ============================================================
load_dotenv()

_client = OpenAI(
    base_url="https://api.deepseek.com",       # DeepSeek API 地址
    api_key=os.getenv("DEEPSEEK_API_KEY"),     # 从 .env 读取密钥
)

DEFAULT_MODEL = "deepseek-chat"                # 默认模型


# ============================================================
# 1. LLM 调用封装 —— 各章节中最常见的 llm_call()
# ============================================================
def llm_call(
    prompt: str,
    system: str = "你是一个智能助手。",
    model: str = DEFAULT_MODEL,
    temperature: float = 0.7,
    max_tokens: int = 2000,
) -> str:
    """
    调用 LLM 并返回文本回复。
    这是各章节中最基础的辅助函数，等价于直接调用 API 的简化版。

    参数：
        prompt: 用户输入的提示词
        system: 系统角色设定（默认：智能助手）
        model: 使用的模型名称
        temperature: 控制随机性（0=确定性，1=随机）
        max_tokens: 最大输出 Token 数

    返回：
        LLM 的文本回复（str）
    """
    response = _client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content


# ============================================================
# 2. 工具执行 —— 模拟工具注册与调用
# ============================================================

# 工具注册表：名称 → 执行函数
_TOOL_REGISTRY: dict[str, callable] = {}


def register_tool(name: str, func: callable):
    """
    注册一个工具到全局工具表。

    示例：
        register_tool("get_weather", lambda city: f"{city}: 25°C, 晴")
    """
    _TOOL_REGISTRY[name] = func


def execute_tool(name: str, args: dict) -> str:
    """
    执行已注册的工具，返回 JSON 字符串结果。

    参数：
        name: 工具名称
        args: 工具参数（字典）

    返回：
        工具执行结果（JSON 字符串）

    异常处理：
        - 工具不存在 → 返回错误 JSON
        - 执行异常 → 返回错误 JSON
    """
    if name not in _TOOL_REGISTRY:
        return json.dumps({"error": f"未知工具: {name}"})
    try:
        result = _TOOL_REGISTRY[name](**args)
        # 如果返回的不是字符串，序列化为 JSON
        return json.dumps(result, ensure_ascii=False) if not isinstance(result, str) else result
    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)


# 预注册示例工具（各章节可直接使用）
register_tool("get_weather", lambda city: {"city": city, "temp": "25°C", "weather": "晴"})
register_tool("search_hotels", lambda city, check_in="": {
    "city": city,
    "hotels": [
        {"name": "和平饭店", "price": "680元/晚"},
        {"name": "锦江之星", "price": "320元/晚"},
    ]
})


# ============================================================
# 3. 文本解析 —— 从 LLM 输出中提取结构化信息
# ============================================================
def parse_action(response_text: str) -> dict:
    """
    从 ReAct 格式的 LLM 输出中解析 Action（工具名 + 参数）。

    期望输入格式：
        Thought: 我需要查天气
        Action: get_weather({"city": "北京"})

    返回：
        {"name": "get_weather", "args": {"city": "北京"}}
    """
    # 用正则匹配 "Action: tool_name({...})" 格式
    match = re.search(r"Action:\s*(\w+)\((.+?)\)", response_text, re.DOTALL)
    if match:
        name = match.group(1)
        args_str = match.group(2)
        try:
            args = json.loads(args_str)  # 尝试解析 JSON 参数
        except json.JSONDecodeError:
            # 如果不是 JSON，尝试当作单个字符串参数
            args = {"input": args_str.strip().strip('"').strip("'")}
        return {"name": name, "args": args}
    # 未找到 Action，返回空操作
    return {"name": "", "args": {}}


def parse_plan(plan_text: str) -> list[dict]:
    """
    从 Plan-and-Solve 的计划文本中解析出结构化步骤列表。

    期望输入格式：
        Step 1: 查询天气 - 工具: get_weather - 参数: {"city": "上海"}
        Step 2: 搜索酒店 - 工具: search_hotels - 参数: {"city": "上海"}

    返回：
        [
            {"step": 1, "desc": "查询天气", "tool": "get_weather", "args": {"city": "上海"}},
            {"step": 2, "desc": "搜索酒店", "tool": "search_hotels", "args": {"city": "上海"}},
        ]
    """
    steps = []
    # 逐行匹配 "Step N: 描述 - 工具: name - 参数: {...}"
    for line in plan_text.strip().split("\n"):
        match = re.match(
            r"Step\s*(\d+)\s*:\s*(.+?)\s*-\s*工具\s*:\s*(\w+)\s*-\s*参数\s*:\s*(.+)",
            line, re.IGNORECASE
        )
        if match:
            try:
                args = json.loads(match.group(4))
            except json.JSONDecodeError:
                args = {"input": match.group(4).strip()}
            steps.append({
                "step": int(match.group(1)),
                "desc": match.group(2).strip(),
                "tool": match.group(3).strip(),
                "args": args,
            })
    return steps


# ============================================================
# 4. 记忆管理 —— 简化版记忆系统
# ============================================================

# 全局记忆存储（列表形式，模拟长期记忆）
_MEMORY_STORE: list[str] = []


def save_to_memory(experience: str):
    """
    将经验/反思结果保存到记忆存储中。
    这是一个简化版的记忆系统，实际项目中可用向量数据库替代。

    参数：
        experience: 要保存的经验文本
    """
    _MEMORY_STORE.append(experience)


def get_memories() -> list[str]:
    """获取所有已保存的记忆。"""
    return _MEMORY_STORE.copy()


# ============================================================
# 5. 计划执行 —— Plan-and-Solve 的步骤执行器
# ============================================================
def execute_plan_steps(plan_text: str, tools: list) -> list[dict]:
    """
    解析计划文本并逐步执行每个步骤。

    参数：
        plan_text: LLM 生成的计划文本
        tools: 工具 Schema 列表（用于验证工具是否存在）

    返回：
        每步的执行结果列表
    """
    steps = parse_plan(plan_text)
    results = []
    for step in steps:
        result = execute_tool(step["tool"], step["args"])
        results.append({
            "step": step["step"],
            "description": step["desc"],
            "result": result,
        })
    return results


# ============================================================
# 6. Token 计数与摘要 —— 上下文工程相关
# ============================================================
def count_tokens(texts: list[str]) -> int:
    """
    估算文本列表的总 Token 数。
    使用简单启发式：中文约 1.5 token/字，英文约 0.75 token/word。
    精确计数可用 tiktoken 库。

    参数：
        texts: 文本列表

    返回：
        估算的总 Token 数（int）
    """
    try:
        import tiktoken
        enc = tiktoken.get_encoding("cl100k_base")  # GPT-4 / DeepSeek 兼容的编码
        total = 0
        for text in texts:
            total += len(enc.encode(text))
        return total
    except ImportError:
        # 没有 tiktoken 时使用简单估算：中文 1.5 token/字，英文 1 token/word
        total = 0
        for text in texts:
            # 粗略估算：统计中文字符数 × 1.5 + 英文单词数
            chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
            english_words = len(re.findall(r'[a-zA-Z]+', text))
            total += int(chinese_chars * 1.5 + english_words)
        return total


def summarize(messages: list[dict], max_length: int = 200) -> str:
    """
    将对话历史压缩为简短摘要。
    通过 LLM 生成对话摘要，保留关键信息。

    参数：
        messages: 对话消息列表（格式：[{"role": "user", "content": "..."}]）
        max_length: 摘要最大字符数

    返回：
        压缩后的对话摘要文本
    """
    if not messages:
        return ""

    # 将消息列表转为可读文本
    conversation_text = "\n".join(
        f"{m.get('role', 'unknown')}: {m.get('content', '')}"
        for m in messages
    )

    # 用 LLM 生成摘要
    summary = llm_call(
        f"请将以下对话历史压缩为一段简短的摘要（不超过{max_length}字），"
        f"保留用户的关键偏好和重要信息：\n\n{conversation_text}",
        system="你是一个对话摘要助手。",
        temperature=0,  # 摘要用低温度，尽量准确
    )
    return summary[:max_length]  # 截断保护


# ============================================================
# 7. MCP 工具调用 —— 简化版 MCP 客户端
# ============================================================
def mcp_call(tool_name: str, args: dict) -> dict:
    """
    模拟 MCP 工具调用（简化版）。
    实际项目中应使用 mcp 库的 ClientSession 连接真实 MCP 服务器。
    这里直接调用已注册的工具，方便演示。

    参数：
        tool_name: MCP 工具名称
        args: 工具参数

    返回：
        工具执行结果（dict）
    """
    result_str = execute_tool(tool_name, args)
    try:
        return json.loads(result_str)
    except json.JSONDecodeError:
        return {"raw": result_str}


# 预注册 MCP 风格的工具
register_tool("get_routes", lambda origin, destination: {
    "origin": origin,
    "destination": destination,
    "distance": "1200km",
    "duration": "2小时",
    "routes": ["高铁", "飞机"]
})
register_tool("search_poi", lambda city, keyword: {
    "city": city,
    "keyword": keyword,
    "results": [
        {"name": f"{city}{keyword}推荐1", "rating": 4.5},
        {"name": f"{city}{keyword}推荐2", "rating": 4.2},
    ]
})


# ============================================================
# 8. 链路追踪 —— 可观测性相关
# ============================================================
def save_trace(trace: dict):
    """
    保存追踪记录（简化版）。
    实际项目中应发送到 LangSmith / Phoenix / Langfuse 等平台。
    这里将追踪记录写入本地 JSON 文件。

    参数：
        trace: 追踪记录字典，包含 input/output/steps/duration 等字段
    """
    # 简化版：打印追踪摘要 + 写入本地文件
    print(f"[Trace] 输入: {trace.get('input', '')[:50]}...")
    print(f"[Trace] 耗时: {trace.get('duration', 0):.2f}s")
    print(f"[Trace] 步骤数: {len(trace.get('steps', []))}")

    # 写入本地文件（追加模式）
    trace_file = "agent_traces.jsonl"
    with open(trace_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(trace, ensure_ascii=False, default=str) + "\n")


# ============================================================
# 9. LangGraph 辅助函数
# ============================================================
def decide_action(llm_response) -> str:
    """
    根据 LLM 的回复判断下一步动作。
    用于 LangGraph 状态图中的条件路由。

    参数：
        llm_response: LLM 的回复消息对象

    返回：
        "tool" - 需要调用工具
        "respond" - 直接回复用户
    """
    # 如果 LLM 回复中包含工具调用请求
    if hasattr(llm_response, 'tool_calls') and llm_response.tool_calls:
        return "tool"
    return "respond"


# ============================================================
# 模块自测
# ============================================================
if __name__ == "__main__":
    print("=" * 50)
    print("Hello-Agents 辅助函数模块 - 自测")
    print("=" * 50)

    # 测试 llm_call
    print("\n--- 测试 llm_call ---")
    result = llm_call("用一句话介绍上海")
    print(f"LLM 回复: {result[:100]}")

    # 测试 execute_tool
    print("\n--- 测试 execute_tool ---")
    print(f"天气: {execute_tool('get_weather', {'city': '北京'})}")
    print(f"酒店: {execute_tool('search_hotels', {'city': '上海'})}")

    # 测试 parse_action
    print("\n--- 测试 parse_action ---")
    action = parse_action('Action: get_weather({"city": "北京"})')
    print(f"解析结果: {action}")

    # 测试 count_tokens
    print("\n--- 测试 count_tokens ---")
    tokens = count_tokens(["你好世界", "Hello World"])
    print(f"Token 估算: {tokens}")

    # 测试记忆
    print("\n--- 测试记忆系统 ---")
    save_to_memory("用户喜欢靠窗座位")
    print(f"记忆: {get_memories()}")

    print("\n✅ 自测完成")
