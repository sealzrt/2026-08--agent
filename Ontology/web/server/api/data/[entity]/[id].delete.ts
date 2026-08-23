import { deleteRow, deleteRowsByProject, ENTITY_TABLES } from '~/server/utils/db'

/** DELETE /api/data/:entity/:id —— 删除业务实体实例；删除 project 时级联清理其下全部业务数据 */
export default defineEventHandler((event) => {
  const entity = getRouterParam(event, 'entity')
  const id = getRouterParam(event, 'id')
  const table = ENTITY_TABLES[entity ?? '']
  if (!table) {
    throw createError({ statusCode: 404, message: `未知实体: ${entity}` })
  }
  if (entity === 'project') {
    // 级联删除：该项目的全部业务数据 + 项目本身
    const affected = deleteRowsByProject(id!)
    if (!affected.project) {
      throw createError({ statusCode: 404, message: `项目不存在: ${id}` })
    }
    return { ok: true, cascade: true, deleted: affected }
  }
  const ok = deleteRow(table, id!)
  if (!ok) {
    throw createError({ statusCode: 404, message: `记录不存在: ${id}` })
  }
  return { ok: true }
})
