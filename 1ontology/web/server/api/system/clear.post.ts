/**
 * POST /api/system/clear —— 清空业务数据（保留 项目 与 本体）
 *
 * 危险操作：删除所有合同/风险/要素/需求/方案/里程碑/任务/进度/文档/售前/运维/干系人数据
 */

import { db } from '~/server/utils/db'

const BIZ_TABLES = [
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
  'document'
]

export default defineEventHandler(() => {
  for (const t of BIZ_TABLES) {
    db.exec(`DELETE FROM ${t}`)
  }
  return { ok: true, message: '业务数据已清空（项目与本体保留）' }
})
