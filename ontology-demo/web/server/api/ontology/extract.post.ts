/**
 * POST /api/ontology/extract —— 文档自动建模引擎（手动模式）
 *
 * 输入：{ documentId } 或 { content, docType }
 * 输出：{ documentId, docType, title, suggestions }
 *   前端展示建议 → 人工勾选确认 → 调已有 API 落库（可控闭环）
 *   核心逻辑见 server/utils/extract-engine.ts（与上传自动建模共用）
 */

import { listRows } from '~/server/utils/db'
import { extractFromText } from '~/server/utils/extract-engine'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  let doc: any = null
  let content: string = body?.content
  let docType: string = body?.docType || '合同内容'
  let title: string = body?.title || '未命名文档'

  if (body?.documentId) {
    const docs = await listRows('document')
    doc = docs.find((d: any) => d.id === body.documentId)
    if (!doc) {
      throw createError({ statusCode: 404, message: '文档不存在' })
    }
    content = doc.content
    docType = doc.docType || '合同内容'
    title = doc.title || '未命名文档'
  }

  if (!content || !content.trim()) {
    throw createError({ statusCode: 400, message: '缺少文档内容（content 或 documentId）' })
  }

  const suggestions = await extractFromText(content, docType)

  return {
    documentId: doc?.id,
    docType,
    title,
    suggestions
  }
})
