import { insertRow, ENTITY_TABLES } from '~/server/utils/db'

/** POST /api/data/:entity —— 创建业务实体实例 */
export default defineEventHandler(async (event) => {
  const entity = getRouterParam(event, 'entity')
  const table = ENTITY_TABLES[entity ?? '']
  if (!table) {
    throw createError({ statusCode: 404, message: `未知实体: ${entity}` })
  }
  const body = await readBody(event)
  if (!body) {
    throw createError({ statusCode: 400, message: '请求体为空' })
  }
  return insertRow(table, body)
})
