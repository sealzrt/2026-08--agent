# 项目长期记忆

## 本体论-agent 教程（01-概念基础 等 Markdown 文档）

- **文档渲染环境**：用户用 VSCode 预览 Markdown 教程。VSCode 内置预览默认 `markdown.preview.allowUnsafeHtml=false`，内联 `<svg>` 图会被剥离不显示；Mermaid 需装插件才渲染。
- **图格式约定（重要）**：给教程文档配图时要考虑兼容性——
  - 内联 SVG：GitHub / Typora / MPE 插件可见；VSCode 内置预览需开启 allowUnsafeHtml
  - Mermaid：需 VSCode 装 Mermaid 插件
  - PNG 图片：所有环境都可见（最稳，已采用）
- 已给「01.为什么需要本体论.md」配了 4 幅 PNG 图（输出目录 `01-概念基础/assets/`），使用 `![alt](assets/xxx.png)` 引用：
  - fig1-who-understands.png（谁懂业务世界）
  - fig2-fragmentation.png（长链路碎片化）
  - fig3-code-forgotten.png（代码规则遗忘）
  - fig4-blackhole.png（认知黑洞）
- 核心框架：1.1=空间碎片化(横)、1.2=时间衰减(竖)、认知黑洞=AI不懂+人懂得不全+懂的部分在流失
- **SVG→PNG 渲染工作流（已扩展为支持透明背景）**：在 `D:\工作\2026-08--agent\.workbuddy\tmp_figs\` 生成 HTML 包装页（body 背景 transparent）→ 本地 python -m http.server 起服 → Chrome `--headless --force-device-scale-factor=2 --window-size=680,H --default-background-color=00000000 --screenshot` 经 HTTP 截 PNG → 杀进程、清理。深色卡片 SVG + 透明背景 PNG 嵌入 Markdown 在白底/深底主题下都好看。注意 file:// 协议在 Chrome headless 下不可靠，必须用 http。

## ontology-demo（项目实施风险管控工具）

- 需求规格说明书 v1.0：8 张 Mermaid 图（图 1 1.1产品定位 / 图 2 3.1端到端流程 / 图 3 闸门 / 图 4 决策链 / 图 5 导航 / 图 6 ER / 图 7 状态机 / 图 8 甘特）。图 1 已于 2026-08-25 优化为 PNG（深色卡片 + 顶部 amber 定位条 + 阶段风险标签 + 闭环回流），SVG 源在 `01.需求文档/assets/fig1-risk-control-full-lifecycle.svg`。
- 落地约定：优化后的图均放 `01.需求文档/assets/`，文档用 `![图 X ...](assets/fig-X-xxx.png)` 引用。
- 待办：其余 7 张 Mermaid 图体检报告已交付，等用户决定优化范围。
