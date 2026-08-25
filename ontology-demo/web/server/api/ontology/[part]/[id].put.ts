import { updateRow, ONTOLOGY_TABLES } from '~/server/utils/db'

/** PUT /api/ontology/:part/:id —— 更新本体元素 */
export default defineEventHandler(async (event) => {
  const part = getRouterParam(event, 'part')
  const id = getRouterParam(event, 'id')
  const table = ONTOLOGY_TABLES[part ?? '']
  if (!table) {
    throw createError({ statusCode: 404, message: `未知本体分段: ${part}` })
  }
  const body = await readBody(event)
  const row = updateRow(table, id!, body ?? {})
  if (!row) {
    throw createError({ statusCode: 404, message: `记录不存在: ${id}` })
  }
  return row
})
