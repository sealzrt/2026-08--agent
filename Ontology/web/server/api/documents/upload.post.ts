/**
 * POST /api/documents/upload —— 上传并解析文档
 *
 * multipart 字段：file（.docx/.pdf/.txt）、docType、title、projectId
 * 解析结果存入 document 表（content 为纯文本），供自动建模/识别使用。
 */

import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import { insertRow } from '~/server/utils/db'

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
    throw createError({ statusCode: 400, message: '未能从文档中提取到文本内容（可能是扫描件/图片型 PDF）' })
  }

  return insertRow('document', {
    projectId,
    docType,
    title,
    content: text.slice(0, 20000),
    reviewed: false
  })
})
