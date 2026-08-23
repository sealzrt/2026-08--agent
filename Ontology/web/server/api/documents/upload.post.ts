/**
 * POST /api/documents/upload —— 上传并解析文档，**自动完成建模落库**
 *
 * multipart 字段：file（.docx/.pdf/.txt/.md）、docType、title、projectId
 *
 * 流程：解析文本 → 存 document → 自动建模（extractFromText）
 *   → **自动采纳**：合同要素(element) / 功能清单(feature) / 实例(instance) 直接落库
 *   → **风险建议(risk) 返回前端展示**，可一键采纳到风险中心
 *   → 新增类(class) 建议返回，不影响已有本体
 */

import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import { insertRow, ENTITY_TABLES } from '~/server/utils/db'
import { extractFromText } from '~/server/utils/extract-engine'

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  if (!parts) {
    throw createError({ statusCode: 400, message: '未收到上传内容' })
  }

  const file = parts.find((p) => p.name === 'file' && p.filename)
  if (!file) {
    throw createError({ statusCode: 400, message: '缺少文件（字段名 file）' })
  }

  const docType = parts.find((p) => p.name === 'docType')?.data?.toString() || '合同内容'
  const title =
    parts.find((p) => p.name === 'title')?.data?.toString() || file.filename || '未命名文档'
  const projectId =
    parts.find((p) => p.name === 'projectId')?.data?.toString() || undefined

  if (!projectId) {
    throw createError({ statusCode: 400, message: '请先选择归属项目（所有数据按项目维度管理）' })
  }

  const filename = (file.filename || '').toLowerCase()
  let text = ''

  try {
    if (filename.endsWith('.docx')) {
      const res = await mammoth.extractRawText({ buffer: file.data })
      text = res.value
    } else if (filename.endsWith('.pdf')) {
      const parser = new PDFParse({ data: file.data })
      const res = await parser.getText()
      text = res.text
    } else if (filename.endsWith('.txt') || filename.endsWith('.md')) {
      text = Buffer.from(file.data).toString('utf-8')
    } else {
      throw createError({ statusCode: 400, message: '仅支持 .docx / .pdf / .txt / .md 文件' })
    }
  } catch (e: any) {
    if (e?.statusCode) throw e
    throw createError({ statusCode: 500, message: `文档解析失败: ${e?.message || e}` })
  }

  if (!text.trim()) {
    throw createError({ statusCode: 400, message: '未能从文档中提取到文本内容（可能是扫描件/图片型 PDF）。请用 macOS「预览」打开 PDF 选中文字复制，到文档中心点「📋 粘贴文本录入」保存。' })
  }

  // 剔除 PDFParse 默认添加的页码占位（"--- N of M ---"），真实内容极短 → 判定扫描件
  const realText = text
    .replace(/^--\s*\d+\s+of\s+\d+\s*--\s*$/gm, '')
    .replace(/\s+/g, '')
  if (realText.length < 30) {
    throw createError({
      statusCode: 400,
      message: '这是扫描件 PDF（无文本层，仅提取到页码占位）。请用 macOS「预览」打开 PDF 选中文字复制（Cmd+A 全选 → Cmd+C），到文档中心点「📋 粘贴文本录入」保存。'
    })
  }

  // 1. 保存文档
  const doc = insertRow('document', {
    projectId,
    docType,
    title,
    content: text,
    reviewed: false
  })

  // 2. 自动建模
  const suggestions = await extractFromText(text, docType)

  // 3. 自动采纳：合同要素 / 功能清单 / 实例 直接落库（事实抽取，低风险）
  const autoKinds = new Set(['element', 'feature', 'instance'])
  let adopted = { elements: 0, features: 0, instances: 0 }
  for (const s of suggestions) {
    if (!autoKinds.has(s.kind)) continue
    try {
      const table = ENTITY_TABLES[s.entity]
      if (!table) continue
      insertRow(table, { ...s.fields, projectId })
      if (s.kind === 'element') adopted.elements++
      else if (s.kind === 'feature') adopted.features++
      else adopted.instances++
    } catch {
      /* 单条失败不影响整体 */
    }
  }

  // 4. 风险建议返回前端（可一键采纳）；新增类建议也返回（供参考）
  const riskSuggestions = suggestions.filter((s) => s.kind === 'risk')
  const classSuggestions = suggestions.filter((s) => s.kind === 'class')

  return {
    ...doc,
    autoModeled: true,
    adopted,
    riskSuggestions,
    classSuggestions
  }
})
