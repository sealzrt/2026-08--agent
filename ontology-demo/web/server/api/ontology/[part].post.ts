import { insertRow, ONTOLOGY_TABLES } from '~/server/utils/db'

/** POST /api/ontology/:part —— 创建本体元素（类/属性/关系） */
export default defineEventHandler(async (event) => {
  const part = getRouterParam(event, 'part')
  const table = ONTOLOGY_TABLES[part ?? '']
  if (!table) {
    throw createError({ statusCode: 404, message: `未知本体分段: ${part}` })
  }
  const body = await readBody(event)
  if (!body || !body.id) {
    throw createError({ statusCode: 400, message: '缺少 id 字段' })
  }
  return insertRow(table, body)
})
