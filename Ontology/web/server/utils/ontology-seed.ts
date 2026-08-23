/**
 * 初始本体定义 + 内置示例数据（演示模式）
 *
 * 对应方案 v0.4 第 3 节"全链路版本体建模草案"。
 * 首次启动（表为空）时自动播种，幂等。
 */

import { db, listRows, insertRow } from './db'

const classes = [
  { id: 'cls_bid', name: '商机', code: 'bid', phase: 'presales', description: '售前商机：投标信息、售前方案、报价、评审', parentId: '' },
  { id: 'cls_contract', name: '合同', code: 'contract', phase: 'implementation', description: '交付范围、里程碑付款、验收条款、SLA', parentId: '' },
  { id: 'cls_project', name: '项目', code: 'project', phase: 'implementation', description: '项目编号、名称、客户、实施周期、状态', parentId: '' },
  { id: 'cls_plan', name: '计划', code: 'plan', phase: 'implementation', description: '项目计划：里程碑与任务的集合', parentId: '' },
  { id: 'cls_milestone', name: '里程碑', code: 'milestone', phase: 'implementation', description: '关键节点：计划起止、实际完成、延期', parentId: 'cls_plan' },
  { id: 'cls_task', name: '任务', code: 'task', phase: 'implementation', description: '具体工作项：负责人、计划起止、状态', parentId: 'cls_plan' },
  { id: 'cls_progress', name: '进度', code: 'progress', phase: 'implementation', description: '实际进度：百分比、偏差、阻塞状态', parentId: '' },
  { id: 'cls_requirement', name: '需求', code: 'requirement', phase: 'implementation', description: '需求清单：优先级、变更次数、确认状态', parentId: '' },
  { id: 'cls_solution', name: '方案', code: 'solution', phase: 'implementation', description: '产品方案/技术方案：评审状态、未决项', parentId: '' },
  { id: 'cls_risk', name: '风险', code: 'risk', phase: 'implementation', description: '风险登记：类型、等级、概率、影响、缓解', parentId: '' },
  { id: 'cls_opsEvent', name: '运维事件', code: 'opsEvent', phase: 'ops', description: '质保期工单：SLA 状态、响应/解决时长', parentId: '' },
  { id: 'cls_sla', name: 'SLA', code: 'sla', phase: 'ops', description: '服务级别协议：响应时限、解决时限', parentId: '' },
  { id: 'cls_warranty', name: '质保期', code: 'warranty', phase: 'ops', description: '质保起止日期与覆盖范围', parentId: '' },
  { id: 'cls_stakeholder', name: '干系人', code: 'stakeholder', phase: 'common', description: '客户方/我方人员及其角色', parentId: '' },
  { id: 'cls_document', name: '文档', code: 'document', phase: 'common', description: '合同/范围/功能清单/原型/技术方案等文档', parentId: '' }
]

const properties = [
  // 合同
  { id: 'prp_contract_scope', classId: 'cls_contract', name: '项目范围', code: 'scopeText', type: 'text', required: true, description: '合同约定的交付范围文本' },
  { id: 'prp_contract_accept', classId: 'cls_contract', name: '验收条款', code: 'hasAcceptanceClause', type: 'boolean', required: true, description: '验收标准/条款是否明确' },
  { id: 'prp_contract_amount', classId: 'cls_contract', name: '合同金额', code: 'amount', type: 'number', required: false, description: '合同总金额' },
  { id: 'prp_contract_no', classId: 'cls_contract', name: '合同编号', code: 'contractNo', type: 'string', required: true, description: '合同编号' },
  // 项目
  { id: 'prp_project_name', classId: 'cls_project', name: '项目名称', code: 'name', type: 'string', required: true, description: '项目名称' },
  { id: 'prp_project_status', classId: 'cls_project', name: '项目状态', code: 'status', type: 'enum', required: true, description: '项目状态', enumValues: '立项,执行中,已验收,运维质保,已关闭' },
  // 里程碑
  { id: 'prp_milestone_delay', classId: 'cls_milestone', name: '延期天数', code: 'delayDays', type: 'number', required: false, description: '相对计划延期的天数' },
  // 需求
  { id: 'prp_req_change', classId: 'cls_requirement', name: '变更次数', code: 'changeCount', type: 'number', required: false, description: '需求变更次数（>3 触发范围风险）' },
  { id: 'prp_req_confirmed', classId: 'cls_requirement', name: '已确认', code: 'isConfirmed', type: 'boolean', required: true, description: '需求是否经客户确认' },
  // 方案
  { id: 'prp_solution_review', classId: 'cls_solution', name: '评审状态', code: 'reviewStatus', type: 'enum', required: true, description: '评审状态', enumValues: '未评审,评审中,已评审,已定稿' },
  { id: 'prp_solution_unresolved', classId: 'cls_solution', name: '存在未决项', code: 'hasUnresolvedItems', type: 'boolean', required: true, description: '是否存在未解决项' },
  // 风险
  { id: 'prp_risk_severity', classId: 'cls_risk', name: '风险等级', code: 'severity', type: 'enum', required: true, description: '红/黄/绿', enumValues: 'high,medium,low' },
  { id: 'prp_risk_prob', classId: 'cls_risk', name: '发生概率', code: 'probability', type: 'number', required: true, description: '0-1' },
  { id: 'prp_risk_impact', classId: 'cls_risk', name: '影响程度', code: 'impact', type: 'number', required: true, description: '0-1' },
  // 进度
  { id: 'prp_progress_pct', classId: 'cls_progress', name: '进度百分比', code: 'progressPercent', type: 'number', required: true, description: '0-100' },
  { id: 'prp_progress_blocked', classId: 'cls_progress', name: '是否阻塞', code: 'isBlocked', type: 'boolean', required: true, description: '是否被阻塞' },
  // 运维
  { id: 'prp_ops_sla', classId: 'cls_opsEvent', name: 'SLA 状态', code: 'slaStatus', type: 'enum', required: true, description: 'SLA 履行状态', enumValues: '正常,即将违约,已违约' },
  { id: 'prp_ops_response', classId: 'cls_opsEvent', name: '响应时长(h)', code: 'responseHours', type: 'number', required: false, description: '响应耗时' }
]

const relations = [
  { id: 'rel_bid_contract', name: '中标形成', code: 'becomes', fromClassId: 'cls_bid', toClassId: 'cls_contract', description: '商机中标后形成合同', cardinality: '1-1' },
  { id: 'rel_contract_project', name: '约束', code: 'constrains', fromClassId: 'cls_contract', toClassId: 'cls_project', description: '合同约束项目范围', cardinality: '1-1' },
  { id: 'rel_project_plan', name: '包含', code: 'hasPlan', fromClassId: 'cls_project', toClassId: 'cls_plan', description: '项目包含计划', cardinality: '1-n' },
  { id: 'rel_plan_milestone', name: '包含', code: 'hasMilestone', fromClassId: 'cls_plan', toClassId: 'cls_milestone', description: '计划包含里程碑', cardinality: '1-n' },
  { id: 'rel_plan_task', name: '包含', code: 'hasTask', fromClassId: 'cls_plan', toClassId: 'cls_task', description: '计划包含任务', cardinality: '1-n' },
  { id: 'rel_req_contract', name: '来源于', code: 'derivesFrom', fromClassId: 'cls_requirement', toClassId: 'cls_contract', description: '需求来源于合同条款', cardinality: 'n-1' },
  { id: 'rel_solution_req', name: '实现', code: 'implements', fromClassId: 'cls_solution', toClassId: 'cls_requirement', description: '方案实现需求', cardinality: 'n-m' },
  { id: 'rel_solution_risk', name: '引入风险', code: 'introducesRisk', fromClassId: 'cls_solution', toClassId: 'cls_risk', description: '技术方案引入技术风险', cardinality: '1-n' },
  { id: 'rel_req_risk', name: '变更导致', code: 'causesRisk', fromClassId: 'cls_requirement', toClassId: 'cls_risk', description: '需求变更导致范围风险', cardinality: '1-n' },
  { id: 'rel_milestone_risk', name: '延期导致', code: 'causesRisk', fromClassId: 'cls_milestone', toClassId: 'cls_risk', description: '里程碑延期导致进度风险', cardinality: '1-n' },
  { id: 'rel_progress_risk', name: '偏差触发', code: 'triggersRisk', fromClassId: 'cls_progress', toClassId: 'cls_risk', description: '进度偏差触发风险', cardinality: '1-n' },
  { id: 'rel_risk_milestone', name: '影响', code: 'impacts', fromClassId: 'cls_risk', toClassId: 'cls_milestone', description: '风险影响里程碑', cardinality: 'n-m' },
  { id: 'rel_project_ops', name: '进入', code: 'entersOps', fromClassId: 'cls_project', toClassId: 'cls_opsEvent', description: '项目进入运维质保产生事件', cardinality: '1-n' },
  { id: 'rel_sla_ops', name: '约束', code: 'constrains', fromClassId: 'cls_sla', toClassId: 'cls_opsEvent', description: 'SLA 约束运维事件', cardinality: '1-n' },
  { id: 'rel_doc_contract', name: '描述', code: 'describes', fromClassId: 'cls_document', toClassId: 'cls_contract', description: '文档描述合同', cardinality: 'n-1' },
  { id: 'rel_doc_req', name: '描述', code: 'describes', fromClassId: 'cls_document', toClassId: 'cls_requirement', description: '文档描述需求', cardinality: 'n-1' }
]

/** 示例项目数据（演示模式，仅当无项目时播种） */
const demoProject = {
  id: 'demo-project-001',
  name: '某银行数据平台实施项目',
  customer: '某商业银行',
  manager: '张伟',
  director: '李总',
  startDate: '2026-03-01',
  endDate: '2026-12-31',
  status: '执行中',
  phase: 'implementation'
}

const demoContract = {
  id: 'demo-contract-001',
  projectId: 'demo-project-001',
  contractNo: 'HT-2026-001',
  amount: 1280000,
  signedDate: '2026-02-20',
  scopeText: '数据平台搭建、ETL 开发、报表系统实施，含 5 个里程碑付款节点',
  hasAcceptanceClause: false,
  paymentMilestones: '预付款30% / 需求确认20% / 上线30% / 验收20%'
}

const demoRequirements = [
  {
    id: 'demo-req-001',
    projectId: 'demo-project-001',
    reqNo: 'REQ-001',
    title: '离线报表定时生成',
    priority: '高',
    status: '已确认',
    source: '合同范围',
    changeCount: 4,
    isConfirmed: true,
    description: '每日凌晨生成经营分析报表'
  },
  {
    id: 'demo-req-002',
    projectId: 'demo-project-001',
    reqNo: 'REQ-002',
    title: '实时数据接入',
    priority: '中',
    status: '变更中',
    source: '客户新增',
    changeCount: 2,
    isConfirmed: false,
    description: '新增实时流式数据接入（原范围外）'
  }
]

const demoMilestone = {
  id: 'demo-ms-001',
  projectId: 'demo-project-001',
  name: '需求评审完成',
  planStart: '2026-04-01',
  planEnd: '2026-04-30',
  actualEnd: '2026-05-10',
  delayDays: 10,
  status: '已延期完成'
}

const demoProgress = {
  id: 'demo-prog-001',
  projectId: 'demo-project-001',
  milestoneId: 'demo-ms-001',
  progressPercent: 45,
  delayDays: 10,
  isBlocked: false,
  status: '正常推进'
}

const demoRisks = [
  {
    id: 'demo-risk-001',
    projectId: 'demo-project-001',
    title: '合同验收条款缺失',
    riskType: '验收风险',
    severity: 'high',
    probability: 0.7,
    impact: 0.8,
    mitigation: '补充验收标准确认流程，与客户对齐验收清单',
    mitigationStatus: '制定中',
    status: 'open',
    source: 'rule'
  },
  {
    id: 'demo-risk-002',
    projectId: 'demo-project-001',
    title: '需求蔓延（变更超阈值）',
    riskType: '范围风险',
    severity: 'medium',
    probability: 0.6,
    impact: 0.6,
    mitigation: '冻结需求基线，变更走审批流',
    mitigationStatus: '已落实',
    status: 'mitigating',
    source: 'rule'
  }
]

export function seedIfEmpty(): void {
  // 本体种子：仅在 ontology_class 为空时插入
  if (listRows('ontology_class').length === 0) {
    for (const c of classes) insertRow('ontology_class', c)
    for (const p of properties) {
      insertRow('ontology_property', {
        ...p,
        required: p.required ? 1 : 0,
        enumValues: p.enumValues || undefined
      })
    }
    for (const r of relations) insertRow('ontology_relation', r)
    console.log('[seed] 初始本体已写入（15 类 / 18 属性 / 16 关系）')
  }

  // 示例数据：仅在无项目时播种
  if (listRows('project').length === 0) {
    insertRow('project', demoProject)
    insertRow('contract', demoContract)
    for (const r of demoRequirements) insertRow('requirement', r)
    insertRow('milestone', demoMilestone)
    insertRow('progress', demoProgress)
    for (const r of demoRisks) insertRow('risk', r)
    console.log('[seed] 示例项目数据已写入（演示模式）')
  }
}
