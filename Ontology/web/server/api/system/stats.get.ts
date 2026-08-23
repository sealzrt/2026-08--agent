/**
 * 数据统计 API：返回各业务表数量
 */

import { db } from '~/server/utils/db'

const STAT_TABLES = [
  'project',
  'contract',
  'contract_element',
  'risk',
  'requirement',
  'solution',
  'milestone',
  'task',
  'progress',
  'document',
  'bid',
  'ops_event',
  'sla',
  'warranty',
  'stakeholder'
]

export default defineEventHandler(() => {
  const stats: Record<string, number> = {}
  for (const t of STAT_TABLES) {
    try {
      const row = db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get() as { c: number }
      stats[t] = row.c
    } catch {
      stats[t] = 0
    }
  }
  return stats
})
