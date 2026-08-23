import { deleteRow, ENTITY_TABLES } from '~/server/utils/db'

/** DELETE /api/data/:entity/:id —— 删除业务实体实例 */
export default defineEventHandler((event) => {
  const entity = getRouterParam(event, 'entity')
  const id = getRouterParam(event, 'id')
  const table = ENTITY_TABLES[entity ?? '']
  if (!table) {
    throw createError({ statusCode: 404, message: `未知实体: ${entity}` })
  }
  const ok = deleteRow(table, id!)
  if (!ok) {
    throw createError({ statusCode: 404, message: `记录不存在: ${id}` })
  }
  return { ok: true }
})
