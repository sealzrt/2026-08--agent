# -*- coding: utf-8 -*-
"""配置中心：所有可调参数集中在环境变量 / .env 中。

- 模拟模式 USE_MOCK=true 时不调用真实模型和外部检索，适合测试。
- 真实模式 USE_MOCK=false 时调用模型 API。
"""

import os
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    # 未安装 python-dotenv 时直接从环境变量读取
    pass


def _to_bool(value: str | None, *, default: bool, name: str) -> bool:
    if value is None:
        return default
    normalized = value.strip().lower()
    if normalized in ("1", "true", "yes", "on"):
        return True
    if normalized in ("0", "false", "no", "off"):
        return False
    raise ValueError(f"{name} 必须是 true/false 形式")


def _to_int(value: str | None, *, default: int, name: str, minimum: int = 0) -> int:
    raw = default if value is None else value.strip()
    try:
        parsed = int(raw)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{name} 必须是整数") from exc
    if parsed < minimum:
        raise ValueError(f"{name} 不能小于 {minimum}")
    return parsed


# ---------- 运行模式 ----------
USE_MOCK: bool = _to_bool(os.getenv("USE_MOCK"), default=True, name="USE_MOCK")

# ---------- 流程控制 ----------
MAX_ITERATIONS: int = _to_int(os.getenv("MAX_ITERATIONS"), default=3, name="MAX_ITERATIONS", minimum=1)
RECURSION_LIMIT: int = _to_int(os.getenv("RECURSION_LIMIT"), default=50, name="RECURSION_LIMIT", minimum=1)
QUALITY_THRESHOLD: int = _to_int(os.getenv("QUALITY_THRESHOLD"), default=80, name="QUALITY_THRESHOLD", minimum=0)

# ---------- 模型配置（真实模式使用） ----------
OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
