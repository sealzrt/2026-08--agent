import { deleteRow, ONTOLOGY_TABLES } from '~/server/utils/db'

/** DELETE /api/ontology/:part/:id —— 删除本体元素 */
export default defineEventHandler((event) => {
  const part = getRouterParam(event, 'part')
  const id = getRouterParam(event, 'id')
  const table = ONTOLOGY_TABLES[part ?? '']
  if (!table) {
    throw createError({ statusCode: 404, message: `未知本体分段: ${part}` })
  }
  const ok = deleteRow(table, id!)
  if (!ok) {
    throw createError({ statusCode: 404, message: `记录不存在: ${id}` })
  }
  return { ok: true }
})
