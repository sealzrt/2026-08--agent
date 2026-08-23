import { getById, ENTITY_TABLES } from '~/server/utils/db'

/** GET /api/data/:entity/:id —— 查询单条业务实体 */
export default defineEventHandler((event) => {
  const entity = getRouterParam(event, 'entity')
  const id = getRouterParam(event, 'id')
  const table = ENTITY_TABLES[entity ?? '']
  if (!table) {
    throw createError({ statusCode: 404, message: `未知实体: ${entity}` })
  }
  const row = getById(table, id!)
  if (!row) {
    throw createError({ statusCode: 404, message: `记录不存在: ${id}` })
  }
  return row
})
