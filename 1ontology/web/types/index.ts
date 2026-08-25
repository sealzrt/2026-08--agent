/**
 * 业务实体类型（本体实例数据）
 *
 * 与方案 v0.4 第 3 节对应：售前 / 实施 / 运维质保 三阶段的业务对象。
 * 每个实体均带 projectId 用于多项目隔离（项目总监跨项目视角依赖此字段）。
 */

/** 风险等级 */
export type Severity = 'high' | 'medium' | 'low'

/** 风险状态 */
export type RiskStatus = 'open' | 'mitigating' | 'confirmed' | 'closed' | 'rejected'

/** 识别来源 */
export type RiskSource = 'manual' | 'rule' | 'relation' | 'llm'

/** 通用字段 */
export interface BaseEntity {
  id: string
  projectId?: string
  createdAt: string
  updatedAt: string
}

/** 商机（售前） */
export interface Bid extends BaseEntity {
  name: string
  customer: string
  status: string
  quote?: number
  reviewStatus: string
  proposalText?: string
}

/** 合同 */
export interface Contract extends BaseEntity {
  contractNo: string
  amount?: number
  signedDate?: string
  scopeText: string
  hasAcceptanceClause: boolean
  paymentMilestones?: string
}

/** 项目 */
export interface Project extends BaseEntity {
  name: string
  customer: string
  manager?: string
  director?: string
  startDate?: string
  endDate?: string
  status: string
  phase: string
}

/** 里程碑 */
export interface Milestone extends BaseEntity {
  name: string
  planStart?: string
  planEnd?: string
  actualEnd?: string
  delayDays: number
  status: string
}

/** 任务 */
export interface Task extends BaseEntity {
  name: string
  owner?: string
  planStart?: string
  planEnd?: string
  status: string
}

/** 进度 */
export interface Progress extends BaseEntity {
  milestoneId?: string
  progressPercent: number
  delayDays: number
  isBlocked: boolean
  status: string
}

/** 需求 */
export interface Requirement extends BaseEntity {
  reqNo: string
  title: string
  priority: string
  status: string
  source: string
  changeCount: number
  isConfirmed: boolean
  description?: string
}

/** 方案（产品/技术） */
export interface Solution extends BaseEntity {
  title: string
  type: 'product' | 'technical'
  reviewStatus: string
  techStack?: string
  hasUnresolvedItems: boolean
  content?: string
}

/** 风险 */
export interface Risk extends BaseEntity {
  title: string
  riskType: string
  severity: Severity
  probability: number
  impact: number
  mitigation?: string
  mitigationStatus: string
  status: RiskStatus
  source: RiskSource
  relatedEntityId?: string
}

/** 运维事件/工单 */
export interface OpsEvent extends BaseEntity {
  ticketNo: string
  description: string
  slaStatus: string
  responseHours: number
  resolutionHours: number
  status: string
}

/** SLA */
export interface Sla extends BaseEntity {
  name: string
  responseLimitHours: number
  resolutionLimitHours: number
  penalty?: string
}

/** 质保期 */
export interface Warranty extends BaseEntity {
  startDate: string
  endDate: string
  coverage: string
}

/** 干系人 */
export interface Stakeholder extends BaseEntity {
  name: string
  role: string
  party: 'customer' | 'vendor'
  contact?: string
}

/** 文档（合同/范围/功能清单/原型/技术方案等） */
export interface Document extends BaseEntity {
  docType: string
  title: string
  content?: string
  reviewed: boolean
}

/** 业务实体表名映射（与 server/utils/db.ts 白名单保持一致） */
export type EntityKey =
  | 'bid'
  | 'contract'
  | 'project'
  | 'milestone'
  | 'task'
  | 'progress'
  | 'requirement'
  | 'solution'
  | 'risk'
  | 'opsEvent'
  | 'sla'
  | 'warranty'
  | 'stakeholder'
  | 'document'
