/**
 * POST /api/system/reset —— 重置数据库（清空所有业务数据与项目，含 demo 示例）
 *
 * 危险操作：删除全部业务数据 + 全部项目（含 demo），**保留本体**（类/属性/关系，组织级知识结构）。
 * 重置后为空系统：可从「＋ 新建项目」重新开始。
 */

import { db } from '~/server/utils/db'

const ALL_TABLES = [
  'bid',
  'contract',
  'contract_element',
  'feature',
  'milestone',
  'task',
  'progress',
  'requirement',
  'solution',
  'risk',
  'ops_event',
  'sla',
  'warranty',
  'stakeholder',
  'document',
  'project'
]

export default defineEventHandler(() => {
  for (const t of ALL_TABLES) {
    db.exec(`DELETE FROM ${t}`)
  }
  // 本体（ontology_class/property/relation）保留：这是工具的知识结构，不是业务数据
  return { ok: true, message: '已删除所有业务数据与项目（含 demo），本体保留。可从顶栏「＋ 新建项目」开始。' }
})
