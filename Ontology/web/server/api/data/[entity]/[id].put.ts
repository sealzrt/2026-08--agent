import { updateRow, ENTITY_TABLES } from '~/server/utils/db'

/** PUT /api/data/:entity/:id —— 更新业务实体实例 */
export default defineEventHandler(async (event) => {
  const entity = getRouterParam(event, 'entity')
  const id = getRouterParam(event, 'id')
  const table = ENTITY_TABLES[entity ?? '']
  if (!table) {
    throw createError({ statusCode: 404, message: `未知实体: ${entity}` })
  }
  const body = await readBody(event)
  const row = updateRow(table, id!, body ?? {})
  if (!row) {
    throw createError({ statusCode: 404, message: `记录不存在: ${id}` })
  }
  return row
})
