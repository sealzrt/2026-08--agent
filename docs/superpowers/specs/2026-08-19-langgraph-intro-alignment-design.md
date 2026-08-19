# LangGraph 入门教程对齐与硬化设计

**目标**：把 `ai-agent学习/06.LangGraph入门/` 里的正文、项目代码和入口说明统一起来，修掉明显失配的命令、路径、接口说明和教程级实现缺口，让读者按文档执行时能跑通，按生产章节阅读时不被误导。

**范围**：
- 仅调整 `ai-agent学习/06.LangGraph入门/` 目录下的 md、Python、配置和 notebook 产物。
- 不重写教程主线，不新增独立功能模块。
- 保留“教程 demo”和“生产建议”的分层，避免把教程改成正式产品。

## 设计原则

1. 文档和代码必须讲同一件事。
2. 入口命令要可复制执行，路径要和真实文件一致。
3. 教程代码允许简化，但要显式标注简化点。
4. 状态、响应和审计字段要能覆盖教程第 09/11/15 章讲到的能力。
5. 发布物要干净，避免敏感输出和无关生成文件。

## 方案

### 1) 文档对齐

统一修正文档中的以下问题：
- `README.md` 的快速开始、章节映射、环境说明和 notebook 说明。
- `01.LangGraph是什么.md` 中不存在的 `01_basic_flow.py`。
- `07.工具调用.md`、`08.LLM调用与提示词组织.md`、`12.流式输出与前端集成.md`、`14.项目化目录结构.md`、`15.部署与生产化注意事项.md` 中的命令和接口描述。
- `code/langgraph_intro_project/README.md` 里重复或过时的安装、运行、API 描述。

文档表述上要明确：
- 第 12 章的 API 草图是“教程级接口”，不是完整异步后端。
- 第 14/15 章里的生产化要求，部分在项目里只做到“结构预留”或“教学演示”。
- `langgraph/` 是进阶 notebook，不是主线入口。

### 2) 项目代码硬化

增强 `code/langgraph_intro_project/app/` 的几处薄弱点：
- `app/api/schemas.py`：给请求参数加最基本的长度和空白约束；补全 `TaskResponse` 字段，让状态、质量分、审批信息、风险提示和错误信息可见。
- `app/api/main.py`：把 `__interrupt__` 载荷保存下来，并在 `/events` 和任务查询里暴露；状态构造和响应映射和新字段保持一致。
- `app/state.py`：补 `risk_note`、`approved_at` 等和教程正文一致的状态字段。
- `app/nodes/evaluate.py` / `app/nodes/report.py`：当达到最大轮次仍不达标时写入风险提示，并把它带进最终报告。
- `app/nodes/human_review.py`：记录审批时间，保留审批人/意见。
- `app/nodes/search.py`：对重复检索结果做去重，避免重试轮次把相同资料反复堆进状态。
- `app/llm.py`：补 `HTTPError` / `URLError` / 超时等网络异常处理，避免真实模式直接把 HTTP 请求打崩。

### 3) 项目卫生与测试

补齐最小发布卫生：
- `code/langgraph_intro_project/.gitignore`：忽略 `.env`、`.venv/`、`__pycache__/`、`.pytest_cache/`。
- `code/langgraph_intro_project/pyproject.toml`：补 `build-system`，并让测试入口更稳。
- 清理 notebook 输出中的真实 key 片段、调试 metadata 和过量运行结果。
- 视情况统一 `requirements_full.txt` 的文本编码和换行。

## 文件清单

### 文档
- `ai-agent学习/06.LangGraph入门/README.md`
- `ai-agent学习/06.LangGraph入门/01.LangGraph是什么.md`
- `ai-agent学习/06.LangGraph入门/07.工具调用.md`
- `ai-agent学习/06.LangGraph入门/08.LLM调用与提示词组织.md`
- `ai-agent学习/06.LangGraph入门/10.持久化与会话恢复.md`
- `ai-agent学习/06.LangGraph入门/12.流式输出与前端集成.md`
- `ai-agent学习/06.LangGraph入门/14.项目化目录结构.md`
- `ai-agent学习/06.LangGraph入门/15.部署与生产化注意事项.md`
- `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/README.md`

### 代码
- `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/app/api/schemas.py`
- `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/app/api/main.py`
- `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/app/state.py`
- `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/app/graph.py`
- `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/app/llm.py`
- `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/app/nodes/analyze.py`
- `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/app/nodes/evaluate.py`
- `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/app/nodes/human_review.py`
- `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/app/nodes/report.py`
- `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/app/nodes/search.py`
- `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/pyproject.toml`
- `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/.gitignore`
- `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/tests/test_nodes.py`
- `ai-agent学习/06.LangGraph入门/code/langgraph_intro_project/tests/test_graph.py`

## 验收标准

1. 根 README 和章节正文里的命令都指向真实存在的文件。
2. 第 01 章不再引用不存在的脚本名。
3. 第 12 章 API 文档和项目 API 的行为不再互相打架。
4. `TaskResponse` 能表达任务执行、审批和失败的关键状态。
5. 人工审批后，结果里能看到审批时间和风险提示。
6. 重试检索不会无限重复塞入相同文档。
7. notebook 不再保留明显的真实 key 片段或无关运行噪声。
8. 项目目录能用一条明确的安装说明跑测试和脚本。

## 约束

- 不把教程 demo 改成完整生产异步架构。
- 不引入额外第三方框架。
- 不改章节顺序，不删主线内容。
- 只做和教程一致性、可执行性、可维护性直接相关的改动。

