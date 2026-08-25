import { listRows, ONTOLOGY_TABLES } from '~/server/utils/db'

/** GET /api/ontology/:part —— 查询某类本体元素（classes / properties / relations） */
export default defineEventHandler((event) => {
  const part = getRouterParam(event, 'part')
  const table = ONTOLOGY_TABLES[part ?? '']
  if (!table) {
    throw createError({ statusCode: 404, message: `未知本体分段: ${part}` })
  }
  return listRows(table)
})
