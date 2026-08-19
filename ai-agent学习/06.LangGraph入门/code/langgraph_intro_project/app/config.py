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


def _to_bool(value: str | None) -> bool:
    return (value or "true").strip().lower() in ("1", "true", "yes", "on")


# ---------- 运行模式 ----------
USE_MOCK: bool = _to_bool(os.getenv("USE_MOCK"))

# ---------- 流程控制 ----------
MAX_ITERATIONS: int = int(os.getenv("MAX_ITERATIONS", "3"))
RECURSION_LIMIT: int = int(os.getenv("RECURSION_LIMIT", "50"))
QUALITY_THRESHOLD: int = int(os.getenv("QUALITY_THRESHOLD", "80"))

# ---------- 模型配置（真实模式使用） ----------
OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
