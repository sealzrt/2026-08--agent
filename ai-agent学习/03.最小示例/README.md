# 最小 AI Agent 示例

这是一个不依赖真实大模型、可直接运行的教学版 AI Agent。

它用本地规则模拟大模型的“决策”过程，重点展示 Agent 的最小工作闭环：

1. 接收用户输入
2. 判断应该调用哪个工具
3. 执行工具
4. 汇总工具结果并生成回答

## 文件说明

- `minimal_agent.py`：最小 Agent 示例代码
- `test_minimal_agent.py`：基于 Python 标准库 `unittest` 的行为测试

## 运行示例

在当前目录执行：

```powershell
python minimal_agent.py
```

示例输出：

```text
用户：请帮我计算 18 + 24
思考：用户输入匹配到 calculator 工具：提取并计算用户输入中的四则运算表达式
工具：calculator
结果：42
回答：计算结果是 42。

用户：这个总集项目的核心管理动作是什么？
思考：用户输入匹配到 project_lookup 工具：返回总集项目管理的本地知识片段
工具：project_lookup
结果：范围确认、分工界面、进度跟踪、风险登记和交付物归档。
回答：根据本地项目知识，建议关注：范围确认、分工界面、进度跟踪、风险登记和交付物归档。
```

## 运行测试

```powershell
python -m unittest test_minimal_agent.py
```

## 为什么这是 Agent

普通脚本通常只按固定步骤执行；这个示例多了一层“根据任务选择工具”的逻辑。

真实 Agent 中，这个选择过程通常由大模型完成；本示例为了便于学习和离线运行，使用简单规则替代大模型。
