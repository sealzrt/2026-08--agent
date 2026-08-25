import * as XLSX from 'xlsx'
import { ENTITY_TABLES } from '~/server/utils/db'

/** 可导入实体的字段定义（供列映射） */
export interface ImportField {
  key: string
  label: string
  required?: boolean
  options?: string[]
}
export const IMPORT_FIELDS: Record<string, ImportField[]> = {
  bid: [
    { key: 'name', label: '商机名称', required: true },
    { key: 'customer', label: '客户' },
    { key: 'status', label: '状态', options: ['跟进中', '已中标', '已流失'] },
    { key: 'quote', label: '报价金额', },
    { key: 'reviewStatus', label: '评审状态', options: ['未评审', '已评审'] },
    { key: 'proposalText', label: '方案描述' }
  ],
  contract: [
    { key: 'contractNo', label: '合同编号', required: true },
    { key: 'amount', label: '合同金额' },
    { key: 'signedDate', label: '签订日期' },
    { key: 'hasAcceptanceClause', label: '验收条款明确' },
    { key: 'scopeText', label: '项目范围' },
    { key: 'paymentMilestones', label: '付款里程碑' }
  ],
  milestone: [
    { key: 'name', label: '里程碑名称', required: true },
    { key: 'planStart', label: '计划开始' },
    { key: 'planEnd', label: '计划完成' },
    { key: 'actualEnd', label: '实际完成' },
    { key: 'delayDays', label: '延期天数' },
    { key: 'status', label: '状态', options: ['未开始', '进行中', '已完成', '已延期完成'] }
  ],
  task: [
    { key: 'name', label: '任务名称', required: true },
    { key: 'owner', label: '负责人' },
    { key: 'planStart', label: '计划开始' },
    { key: 'planEnd', label: '计划完成' },
    { key: 'status', label: '状态', options: ['待办', '进行中', '已完成', '已阻塞'] }
  ],
  requirement: [
    { key: 'reqNo', label: '需求编号', required: true },
    { key: 'title', label: '需求标题', required: true },
    { key: 'priority', label: '优先级', options: ['高', '中', '低'] },
    { key: 'status', label: '状态', options: ['草稿', '已确认', '变更中', '已实现', '已验收'] },
    { key: 'source', label: '来源' },
    { key: 'changeCount', label: '变更次数' },
    { key: 'isConfirmed', label: '已确认' }
  ],
  solution: [
    { key: 'title', label: '方案标题', required: true },
    { key: 'type', label: '方案类型', options: ['product', 'technical'] },
    { key: 'reviewStatus', label: '评审状态', options: ['未评审', '评审中', '已评审', '已定稿'] },
    { key: 'techStack', label: '技术栈' },
    { key: 'hasUnresolvedItems', label: '存在未决项' }
  ],
  risk: [
    { key: 'title', label: '风险标题', required: true },
    { key: 'riskType', label: '风险类型', options: ['验收风险', '范围风险', '进度风险', '技术风险', '交付质量风险', 'SLA违约风险', '回款风险', '合同风险'] },
    { key: 'severity', label: '风险等级', options: ['high', 'medium', 'low'] },
    { key: 'probability', label: '发生概率' },
    { key: 'impact', label: '影响程度' },
    { key: 'mitigation', label: '缓解措施' },
    { key: 'status', label: '状态', options: ['open', 'mitigating', 'confirmed', 'closed', 'rejected'] }
  ],
  feature: [
    { key: 'code', label: '功能编号' },
    { key: 'name', label: '功能名称', required: true },
    { key: 'description', label: '描述' },
    { key: 'priority', label: '优先级', options: ['P0', 'P1', 'P2'] },
    { key: 'status', label: '状态', options: ['未开始', '进行中', '已完成', '已验收'] }
  ],
  stakeholder: [
    { key: 'name', label: '姓名', required: true },
    { key: 'role', label: '角色' },
    { key: 'party', label: '归属', options: ['customer', 'vendor'] },
    { key: 'contact', label: '联系方式' }
  ],
  opsEvent: [
    { key: 'ticketNo', label: '工单编号', required: true },
    { key: 'description', label: '事件描述' },
    { key: 'slaStatus', label: 'SLA状态' },
    { key: 'responseTime', label: '响应时效' }
  ],
  warranty: [
    { key: 'name', label: '维保项目', required: true },
    { key: 'startDate', label: '开始日期' },
    { key: 'endDate', label: '结束日期' },
    { key: 'coverage', label: '服务范围' },
    { key: 'sla', label: 'SLA要求' }
  ],
  document: [
    { key: 'docType', label: '文档类型', options: ['合同内容', '项目范围', '功能清单', '产品原型', '技术方案', '会议纪要'] },
    { key: 'title', label: '文档标题', required: true },
    { key: 'content', label: '文档内容' }
  ]
}

const IMPORT_ENTITY_LABELS: Record<string, string> = {
  bid: '售前商机', contract: '合同', milestone: '里程碑', task: '任务',
  requirement: '需求', solution: '方案', risk: '风险', feature: '功能清单',
  stakeholder: '干系人', opsEvent: '运维事件', warranty: '维保', document: '文档'
}

/**
 * POST /api/import/preview —— 解析 Excel/CSV，返回列与行数据 + 目标实体的可导入字段
 * body: multipart (file, entity)
 */
export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event).catch(() => null)
  if (!form) {
    throw createError({ statusCode: 400, message: '请上传文件' })
  }
  const file = form.find((f) => f.name === 'file')
  const entityField = form.find((f) => f.name === 'entity')
  const entity = entityField ? String(entityField.data) : ''

  if (!file?.data) {
    throw createError({ statusCode: 400, message: '未接收到文件内容' })
  }
  if (!ENTITY_TABLES[entity]) {
    throw createError({ statusCode: 400, message: `未知实体: ${entity}` })
  }

  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(file.data, { type: 'buffer' })
  } catch (e: any) {
    throw createError({ statusCode: 400, message: `文件解析失败：${e?.message || '未知错误'}` })
  }

  const sheetName = wb.SheetNames[0]
  const sheet = wb.Sheets[sheetName]
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  if (!rows.length) {
    throw createError({ statusCode: 400, message: '文件内容为空（第一行应为表头）' })
  }

  const columns = Object.keys(rows[0]).filter((k) => String(k).trim() !== '')

  return {
    entity,
    entityLabel: IMPORT_ENTITY_LABELS[entity] || entity,
    importableFields: IMPORT_FIELDS[entity] || [],
    sheetName,
    columns,
    totalRows: rows.length,
    rows: rows.slice(0, 50) // 预览前 50 行
  }
})
