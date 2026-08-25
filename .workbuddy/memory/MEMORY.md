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
- **SVG→PNG 渲染工作流（可复用）**：在 `D:\工作\2026-08--agent\.workbuddy\tmp_figs\` 生成白底 HTML 包装页 → 本地 python -m http.server 起服 → Chrome `--headless --force-device-scale-factor=2 --window-size=680,H --screenshot` 经 HTTP 截 PNG → 杀进程、清理。注意 file:// 协议在 Chrome headless 下不可靠，必须用 http。
