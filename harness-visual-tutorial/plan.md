# Harness 可视化入门教程 -- 设计方案

> 目标：用 10 章 + 10 张高清图解 + Python/DeepSeek 代码，帮初学者从零理解 Agent Harness。

---

## 目标读者

- 有基础 Python 经验
- 了解什么是 API，但没做过 Agent
- 想系统理解 Harness 的每个模块，而不只是跑一个 demo

## 核心原则

1. **每章一张图**：先看图建立直觉，再看文字和代码
2. **类比优先**：每个概念都用日常场景类比（实习生、工具箱、笔记本...）
3. **代码可运行**：每章代码 copy-paste 就能跑（只需配置 API Key）
4. **渐进式叠加**：ch02 是最小循环，ch03 加工具，ch04 加权限...每章只加一个新机制

## 章节规划

| 章 | 主题 | 类比 | 图解 | 代码量 |
|----|------|------|------|--------|
| 01 | 什么是 Harness | 实习生 + 办公环境 | Agent = Model + Harness 架构图 | 无 |
| 02 | Agent 循环 | 对讲机对话 | 感知-思考-行动循环 | ~30 行 |
| 03 | 工具调用 | 工具箱 | 注册 + 分发流程 | ~60 行 |
| 04 | 权限系统 | 钥匙和门禁 | 权限门控流程 | ~40 行 |
| 05 | 记忆系统 | 笔记本 | 写入 + 召回流程 | ~50 行 |
| 06 | 子代理 | 派助手查资料 | 委托流程图 | ~40 行 |
| 07 | 错误处理 | 备用方案 | 重试 + 降级流程 | ~40 行 |
| 08 | 上下文管理 | 桌面整理 | 压缩管道流程 | ~50 行 |
| 09 | 完整组装 | 组装汽车 | 模块连接关系图 | ~120 行 |
| 10 | 后续方向 | 升级路线 | 扩展方向地图 | 无 |

## 图解设计规范

- **尺寸**：1792x1024（16:9 横版）
- **风格**：白色背景 + 扁平化方块/箭头
- **配色**：
  - 蓝色 #2196F3：主流程
  - 绿色 #4CAF50：成功路径
  - 红色 #F44336：失败路径
  - 橙色 #FF9800：工具/外部
  - 灰色 #9E9E9E：辅助信息
  - 紫色 #9C27B0：记忆/状态
- **字体**：清晰无衬线，中文标注
- **每章 1 张**：聚焦核心概念，不堆细节

## 代码统一模式

```python
import os, json
from openai import OpenAI   # DeepSeek 兼容 OpenAI SDK
from dotenv import load_dotenv

load_dotenv()
deepseek_client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com",
)
MODEL = os.getenv("MODEL_ID", "deepseek-chat")
```

## 每章 Markdown 结构

1. 一句话概括（blockquote）
2. 图解（PNG 嵌入）
3. 通俗理解（类比 + 日常例子）
4. 核心概念（简短定义）
5. 代码（完整可运行 + 详细注释）
6. 运行它（一条命令）
7. 动手试一试（1-2 个练习）
8. 小结与下一章

## 环境要求

```bash
pip install openai python-dotenv
```

```bash
# .env 文件
DEEPSEEK_API_KEY=sk-your-key-here
MODEL_ID=deepseek-chat
```
