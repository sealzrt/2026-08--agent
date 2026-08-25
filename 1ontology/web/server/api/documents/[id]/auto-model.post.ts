import { insertRow, listRows, ENTITY_TABLES } from '~/server/utils/db'
import { extractFromText } from '~/server/utils/extract-engine'

/**
 * POST /api/documents/:id/auto-model —— 对已保存文档执行「自动建模 + 自动落库」
 *
 * 流程：读文档 → 自动建模 → 自动采纳 合同要素/功能清单/实例
 *   → 返回 { adopted, riskSuggestions, classSuggestions }
 * 供「粘贴文本录入」等场景调用，与上传（upload API）体验一致：录入即完成。
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event).catch(() => ({}))
  const projectId = (body.projectId as string) || ''

  const docs = await listRows('document')
  const doc = docs.find((d: any) => d.id === id)
  if (!doc) {
    throw createError({ statusCode: 404, message: '文档不存在' })
  }
  if (!projectId) {
    throw createError({ statusCode: 400, message: '请选择归属项目' })
  }

  const suggestions = await extractFromText(doc.content, doc.docType || '合同内容')

  // 自动采纳：要素 / 功能 / 实例
  const autoKinds = new Set(['element', 'feature', 'instance'])
  const adopted = { elements: 0, features: 0, instances: 0 }
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

  return {
    documentId: doc.id,
    title: doc.title,
    autoModeled: true,
    adopted,
    riskSuggestions: suggestions.filter((s) => s.kind === 'risk'),
    classSuggestions: suggestions.filter((s) => s.kind === 'class')
  }
})
