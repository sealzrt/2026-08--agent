import { insertRow, ENTITY_TABLES } from '~/server/utils/db'

/**
 * POST /api/import/apply —— 按映射批量导入
 * body: { entity, projectId, rows: [{ fieldKey: value, ... }] }
 * 自动剔除未映射/空值字段；布尔与数字做类型转换；返回成功/失败明细。
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const { entity, projectId, rows } = body as {
    entity: string
    projectId?: string
    rows?: Record<string, unknown>[]
  }

  if (!entity || !ENTITY_TABLES[entity]) {
    throw createError({ statusCode: 400, message: `未知实体: ${entity}` })
  }
  if (!Array.isArray(rows) || !rows.length) {
    throw createError({ statusCode: 400, message: '没有可导入的数据行' })
  }
  if (!projectId) {
    throw createError({ statusCode: 400, message: '请选择归属项目（所有数据按项目维度）' })
  }

  const okRows: Record<string, unknown>[] = []
  const failed: { row: number; reason: string }[] = []
  const errors: string[] = []

  rows.forEach((raw, idx) => {
    try {
      const rec: Record<string, unknown> = { projectId }
      for (const [k, v] of Object.entries(raw)) {
        if (v === undefined || v === null || v === '') continue
        const s = String(v).trim()
        if (s === '') continue
        if (/^(是|true|1|Y|yes)$/i.test(s)) { rec[k] = 1; continue }
        if (/^(否|false|0|N|no)$/i.test(s)) { rec[k] = 0; continue }
        const n = Number(s)
        rec[k] = Number.isNaN(n) ? s : n
      }
      insertRow(ENTITY_TABLES[entity], rec)
      okRows.push(rec)
    } catch (e: any) {
      failed.push({ row: idx + 2, reason: e?.message || '未知错误' })
      errors.push(`第 ${idx + 2} 行：${e?.message || '未知错误'}`)
    }
  })

  return {
    ok: true,
    entity,
    total: rows.length,
    success: okRows.length,
    failed: failed.length,
    errors: errors.slice(0, 5)
  }
})
