import { listRows, ENTITY_TABLES } from '~/server/utils/db'

/** GET /api/data/:entity —— 查询业务实体列表，支持 ?projectId= 过滤（多项目隔离） */
export default defineEventHandler((event) => {
  const entity = getRouterParam(event, 'entity')
  const table = ENTITY_TABLES[entity ?? '']
  if (!table) {
    throw createError({ statusCode: 404, message: `未知实体: ${entity}` })
  }
  const query = getQuery(event)
  const projectId = (query.projectId as string) || undefined
  return listRows(table, projectId)
})
