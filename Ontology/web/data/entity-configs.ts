/**
 * 业务实体字段配置（M3）
 *
 * 每个实体配置：API 实体名、页面标题、字段定义（类型/必填/枚举）。
 * EntityManager.vue 依据此配置自动渲染列表列与表单控件。
 */

export interface FieldConfig {
  /** 字段 key（与后端 camelCase 列名一致） */
  key: string
  /** 表单标签 / 列标题 */
  label: string
  type: 'string' | 'text' | 'number' | 'date' | 'boolean' | 'enum' | 'ref'
  required?: boolean
  /** enum 类型时的选项 */
  options?: string[]
  /** ref 类型时：被引用实体（如 feature），下拉选项来自该实体 */
  refEntity?: string
  placeholder?: string
  /** 表格中是否隐藏 */
  hideInTable?: boolean
}

export interface EntityConfig {
  entity: string
  title: string
  desc: string
  fields: FieldConfig[]
}

const fields = (list: FieldConfig[]): FieldConfig[] => list

/** 售前-商机 */
export const bidConfig: EntityConfig = {
  entity: 'bid',
  title: '售前商机',
  desc: '售前阶段：商机登记、售前方案、报价与评审，中标后形成合同。',
  fields: fields([
    { key: 'name', label: '商机名称', type: 'string', required: true },
    { key: 'customer', label: '客户', type: 'string' },
    { key: 'status', label: '投标状态', type: 'enum', options: ['跟进中', '已投标', '已中标', '已放弃'] },
    { key: 'quote', label: '报价（元）', type: 'number' },
    { key: 'reviewStatus', label: '评审状态', type: 'enum', options: ['未评审', '评审中', '已评审'] },
    { key: 'proposalText', label: '售前方案', type: 'text', hideInTable: true }
  ])
}

/** 合同 */
export const contractConfig: EntityConfig = {
  entity: 'contract',
  title: '合同管理',
  desc: '合同内容：交付范围、金额、验收条款、里程碑付款。验收条款缺失会触发验收风险（M4 自动识别）。',
  fields: fields([
    { key: 'contractNo', label: '合同编号', type: 'string', required: true },
    { key: 'amount', label: '合同金额（元）', type: 'number' },
    { key: 'signedDate', label: '签订日期', type: 'date' },
    { key: 'hasAcceptanceClause', label: '验收条款明确', type: 'boolean' },
    { key: 'scopeText', label: '项目范围', type: 'text' },
    { key: 'paymentMilestones', label: '付款里程碑', type: 'text', hideInTable: true },
    { key: 'bidId', label: '关联商机', type: 'string' }
  ])
}

/** 项目（系统主线维度） */
export const projectConfig: EntityConfig = {
  entity: 'project',
  title: '项目管理',
  desc: '项目是系统主线维度。生命周期：售前跟进 → 已签约 → 实施中 → 运维质保 → 已关闭。',
  fields: fields([
    { key: 'name', label: '项目名称', type: 'string', required: true },
    { key: 'customer', label: '客户', type: 'string' },
    { key: 'manager', label: '项目经理', type: 'string' },
    { key: 'director', label: '项目总监', type: 'string' },
    { key: 'startDate', label: '开始日期', type: 'date' },
    { key: 'endDate', label: '计划结束', type: 'date' },
    { key: 'status', label: '生命周期', type: 'enum', options: ['售前跟进', '已签约', '实施中', '运维质保', '已关闭'] },
    { key: 'phase', label: '阶段', type: 'enum', options: ['presales', 'implementation', 'ops'] }
  ])
}

/** 里程碑 */
export const milestoneConfig: EntityConfig = {
  entity: 'milestone',
  title: '里程碑',
  desc: '关键节点：计划起止、实际完成、延期天数。延期 > 7 天会触发进度风险（M4）。',
  fields: fields([
    { key: 'name', label: '里程碑名称', type: 'string', required: true },
    { key: 'planStart', label: '计划开始', type: 'date' },
    { key: 'planEnd', label: '计划完成', type: 'date' },
    { key: 'actualEnd', label: '实际完成', type: 'date' },
    { key: 'delayDays', label: '延期天数', type: 'number' },
    { key: 'status', label: '状态', type: 'enum', options: ['未开始', '进行中', '已完成', '已延期完成'] }
  ])
}

/** 功能清单（全链路对齐锚点） */
export const featureConfig: EntityConfig = {
  entity: 'feature',
  title: '功能清单',
  desc: '合同功能模块（M01 等），是项目计划/产品方案/需求文档的对齐锚点。优先级：P0 必须/P1 应当/P2 尽力。',
  fields: fields([
    { key: 'code', label: '模块编号', type: 'string', required: true, placeholder: '如 M01' },
    { key: 'name', label: '功能名称', type: 'string', required: true },
    { key: 'description', label: '功能描述', type: 'text' },
    { key: 'priority', label: '优先级', type: 'enum', options: ['P0', 'P1', 'P2'] },
    { key: 'status', label: '状态', type: 'enum', options: ['未开始', '设计中', '开发中', '已完成', '已验收'] },
    { key: 'contractId', label: '关联合同', type: 'string' },
    { key: 'source', label: '来源', type: 'enum', options: ['manual', 'rule', 'llm'] }
  ])
}

/** 任务 */
export const taskConfig: EntityConfig = {
  entity: 'task',
  title: '任务',
  desc: '具体工作项：负责人、计划起止、状态，可关联到功能模块（对齐锚点）。',
  fields: fields([
    { key: 'name', label: '任务名称', type: 'string', required: true },
    { key: 'owner', label: '负责人', type: 'string' },
    { key: 'planStart', label: '计划开始', type: 'date' },
    { key: 'planEnd', label: '计划完成', type: 'date' },
    { key: 'featureId', label: '关联功能', type: 'ref', refEntity: 'feature' },
    { key: 'status', label: '状态', type: 'enum', options: ['待办', '进行中', '已完成', '已阻塞'] }
  ])
}

/** 进度 */
export const progressConfig: EntityConfig = {
  entity: 'progress',
  title: '进度跟踪',
  desc: '项目进度：完成百分比、延期、阻塞。偏差超阈值会预警（M4 数据信号）。',
  fields: fields([
    { key: 'progressPercent', label: '进度百分比', type: 'number', required: true },
    { key: 'delayDays', label: '延期天数', type: 'number' },
    { key: 'isBlocked', label: '是否阻塞', type: 'boolean' },
    { key: 'status', label: '状态', type: 'enum', options: ['正常推进', '有风险', '已阻塞'] }
  ])
}

/** 需求 */
export const requirementConfig: EntityConfig = {
  entity: 'requirement',
  title: '需求管理',
  desc: '需求清单：优先级、来源、变更次数、确认状态。变更 > 3 次触发需求蔓延风险（M4）。可关联功能模块对齐。',
  fields: fields([
    { key: 'reqNo', label: '需求编号', type: 'string', required: true },
    { key: 'title', label: '需求标题', type: 'string', required: true },
    { key: 'priority', label: '优先级', type: 'enum', options: ['高', '中', '低'] },
    { key: 'status', label: '状态', type: 'enum', options: ['草稿', '已确认', '变更中', '已实现', '已验收'] },
    { key: 'source', label: '来源', type: 'string' },
    { key: 'changeCount', label: '变更次数', type: 'number' },
    { key: 'isConfirmed', label: '已确认', type: 'boolean' },
    { key: 'featureId', label: '关联功能', type: 'ref', refEntity: 'feature' },
    { key: 'description', label: '描述', type: 'text', hideInTable: true }
  ])
}

/** 方案 */
export const solutionConfig: EntityConfig = {
  entity: 'solution',
  title: '方案管理',
  desc: '产品方案与技术方案：评审状态、技术栈、未决项。未评审/存在未决项触发方案风险（M4）。可关联功能模块对齐。',
  fields: fields([
    { key: 'title', label: '方案标题', type: 'string', required: true },
    { key: 'type', label: '方案类型', type: 'enum', options: ['product', 'technical'] },
    { key: 'reviewStatus', label: '评审状态', type: 'enum', options: ['未评审', '评审中', '已评审', '已定稿'] },
    { key: 'techStack', label: '技术栈', type: 'string' },
    { key: 'hasUnresolvedItems', label: '存在未决项', type: 'boolean' },
    { key: 'featureId', label: '关联功能', type: 'ref', refEntity: 'feature' },
    { key: 'content', label: '方案内容', type: 'text', hideInTable: true }
  ])
}

/** 风险 */
export const riskConfig: EntityConfig = {
  entity: 'risk',
  title: '风险中心',
  desc: '风险登记与处置：类型、等级、概率、影响、缓解措施。支持自动识别结果（M4）的人工确认。',
  fields: fields([
    { key: 'title', label: '风险标题', type: 'string', required: true },
    { key: 'riskType', label: '风险类型', type: 'enum', options: ['验收风险', '范围风险', '进度风险', '技术风险', '交付质量风险', 'SLA违约风险', '回款风险'] },
    { key: 'severity', label: '风险等级', type: 'enum', options: ['high', 'medium', 'low'] },
    { key: 'probability', label: '发生概率', type: 'number' },
    { key: 'impact', label: '影响程度', type: 'number' },
    { key: 'mitigation', label: '缓解措施', type: 'text', hideInTable: true },
    { key: 'mitigationStatus', label: '缓解状态', type: 'enum', options: ['未制定', '制定中', '已落实'] },
    { key: 'status', label: '状态', type: 'enum', options: ['open', 'mitigating', 'confirmed', 'closed', 'rejected'] },
    { key: 'source', label: '识别来源', type: 'enum', options: ['manual', 'rule', 'relation', 'llm'] }
  ])
}

/** 运维事件 */
export const opsEventConfig: EntityConfig = {
  entity: 'opsEvent',
  title: '运维事件',
  desc: '质保期工单：问题描述、SLA 状态、响应/解决时长。SLA 即将违约触发风险（M4）。',
  fields: fields([
    { key: 'ticketNo', label: '工单编号', type: 'string', required: true },
    { key: 'description', label: '问题描述', type: 'text' },
    { key: 'slaStatus', label: 'SLA 状态', type: 'enum', options: ['正常', '即将违约', '已违约'] },
    { key: 'responseHours', label: '响应时长(h)', type: 'number' },
    { key: 'resolutionHours', label: '解决时长(h)', type: 'number' },
    { key: 'status', label: '状态', type: 'enum', options: ['待处理', '处理中', '已解决', '已关闭'] }
  ])
}

/** SLA */
export const slaConfig: EntityConfig = {
  entity: 'sla',
  title: 'SLA 配置',
  desc: '服务级别协议：响应时限、解决时限、违约条款。',
  fields: fields([
    { key: 'name', label: 'SLA 名称', type: 'string', required: true },
    { key: 'responseLimitHours', label: '响应时限(h)', type: 'number' },
    { key: 'resolutionLimitHours', label: '解决时限(h)', type: 'number' },
    { key: 'penalty', label: '违约条款', type: 'text', hideInTable: true }
  ])
}

/** 质保期 */
export const warrantyConfig: EntityConfig = {
  entity: 'warranty',
  title: '质保期',
  desc: '质保起止日期与覆盖范围。',
  fields: fields([
    { key: 'startDate', label: '质保开始', type: 'date', required: true },
    { key: 'endDate', label: '质保结束', type: 'date', required: true },
    { key: 'coverage', label: '覆盖范围', type: 'text' }
  ])
}

/** 干系人 */
export const stakeholderConfig: EntityConfig = {
  entity: 'stakeholder',
  title: '干系人',
  desc: '客户方 / 我方人员及其角色。',
  fields: fields([
    { key: 'name', label: '姓名', type: 'string', required: true },
    { key: 'role', label: '角色', type: 'string' },
    { key: 'party', label: '归属', type: 'enum', options: ['customer', 'vendor'] },
    { key: 'contact', label: '联系方式', type: 'string' }
  ])
}

/** 合同关键要素（实施风险判断基线） */
export const contractElementConfig: EntityConfig = {
  entity: 'contractElement',
  title: '合同关键要素',
  desc: '从合同中抽取的关键要素：金额/关键节点/关键事项/功能清单/交付物/维保/关键指标。后续实施中对照判断延期、遗漏、偏移风险。',
  fields: fields([
    { key: 'category', label: '要素类别', type: 'enum', options: ['amount', 'node', 'keyItem', 'feature', 'deliverable', 'warranty', 'metric'] },
    { key: 'content', label: '要素内容', type: 'text', required: true },
    { key: 'detail', label: '详细说明', type: 'text' },
    { key: 'contractId', label: '关联合同', type: 'string' },
    { key: 'status', label: '跟踪状态', type: 'enum', options: ['pending', 'tracking', 'done', 'risk'] }
  ])
}

/** 文档 */
export const documentConfig: EntityConfig = {
  entity: 'document',
  title: '文档',
  desc: '合同/范围/功能清单/原型/技术方案等文档，作为 M4 自动识别的输入。',
  fields: fields([
    { key: 'docType', label: '文档类型', type: 'enum', options: ['合同内容', '项目范围', '功能清单', '产品原型', '技术方案', '会议纪要'] },
    { key: 'title', label: '文档标题', type: 'string', required: true },
    { key: 'reviewed', label: '已评审', type: 'boolean' },
    { key: 'content', label: '文档内容', type: 'text', hideInTable: true }
  ])
}
