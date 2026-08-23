/**
 * POST /api/ontology/extract —— 文档自动建模引擎（纯规则，零依赖）
 *
 * 输入：{ documentId } 或 { content, docType }
 * 输出：{ documentId, docType, title, suggestions }
 *   suggestions: 建模/风险建议清单（kind: instance 实例 / risk 风险 / class 新类）
 *   前端展示建议 → 人工勾选确认 → 调已有 API 落库（可控闭环）
 */

import { listRows } from '~/server/utils/db'

interface Suggestion {
  id: string
  kind: 'instance' | 'risk' | 'class' | 'element'
  entity: string
  label: string
  fields: Record<string, unknown>
  reason: string
  confidence: number
}

// ===== 合同文本分析 =====
function analyzeContract(text: string): Suggestion[] {
  const out: Suggestion[] = []
  const fields: Record<string, unknown> = {}

  const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(万元|万元整|元)/)
  if (amountMatch) {
    const num = parseFloat(amountMatch[1])
    fields.amount = amountMatch[2].includes('万') ? num * 10000 : num
  }

  const noMatch = text.match(/(?:合同编号|合同号)[：:]\s*([^\s\n，。]+)/)
  if (noMatch) fields.contractNo = noMatch[1]

  const scopeMatch = text.match(/[^。\n]*(?:交付范围|项目范围|建设范围)[^。\n]*。?/)
  if (scopeMatch) fields.scopeText = scopeMatch[0]

  const hasAcceptance = /验收|验收标准|验收条款|交付验收/.test(text)
  fields.hasAcceptanceClause = hasAcceptance

  if (!hasAcceptance) {
    out.push({
      id: 'risk_accept_missing',
      kind: 'risk',
      entity: 'risk',
      label: '合同验收条款缺失',
      fields: {
        title: '合同验收条款缺失',
        riskType: '验收风险',
        severity: 'high',
        probability: 0.7,
        impact: 0.8,
        mitigation: '补充验收标准确认流程，与客户对齐验收清单',
        mitigationStatus: '未制定',
        status: 'open',
        source: 'rule'
      },
      reason: '合同文本中未检测到"验收"相关条款',
      confidence: 0.9
    })
  }

  if (Object.keys(fields).length > 0) {
    out.push({
      id: 'inst_contract',
      kind: 'instance',
      entity: 'contract',
      label: '创建合同实例',
      fields,
      reason: '从合同文本中抽取到关键字段（金额/编号/范围/验收条款）',
      confidence: 0.75
    })
  }

  // ========== 合同通用信号检查（让合同也能识别更多风险与字段）==========

  // 1. 验收标准：抽取若干条 + 风险提示
  const accStdCount = (text.match(/验收标准/g) || []).length
  if (accStdCount >= 2) {
    fields.acceptanceStandards = `合同含 ${accStdCount} 处验收标准`
    out.push({
      id: 'risk_acceptance_density',
      kind: 'risk',
      entity: 'risk',
      label: '验收标准密集',
      fields: {
        title: '验收标准密集，需逐项跟踪',
        riskType: '验收风险',
        severity: 'medium',
        probability: 0.6,
        impact: 0.6,
        mitigation: '建立验收标准清单并逐项勾选，避免漏项',
        mitigationStatus: '未制定',
        status: 'open',
        source: 'rule'
      },
      reason: `合同中出现 ${accStdCount} 处"验收标准"，需逐项跟踪`,
      confidence: 0.75
    })
  }

  // 2. 变更条款密集 → 范围管理风险
  const changeCount = (text.match(/变更/g) || []).length
  if (changeCount >= 10) {
    fields.changeManagement = `合同含 ${changeCount} 处变更相关条款`
    out.push({
      id: 'risk_change_density',
      kind: 'risk',
      entity: 'risk',
      label: '合同变更条款密集',
      fields: {
        title: '合同变更条款密集，需加强变更管理',
        riskType: '范围风险',
        severity: 'medium',
        probability: 0.7,
        impact: 0.7,
        mitigation: '建立变更控制委员会（CCB），所有变更走评审+书面确认',
        mitigationStatus: '未制定',
        status: 'open',
        source: 'rule'
      },
      reason: `合同中出现 ${changeCount} 处"变更"相关条款，变更管理风险高`,
      confidence: 0.8
    })
  }

  // 3. 风险条款 / 违约责任 → 提取为风险（提示项目存在已识别风险）
  const riskWordCount = (text.match(/风险/g) || []).length
  const breachCount = (text.match(/违约/g) || []).length
  if (riskWordCount >= 2 || breachCount >= 3) {
    fields.legalClauses = `风险条款 ${riskWordCount} 处，违约责任 ${breachCount} 处`
    out.push({
      id: 'risk_legal_complexity',
      kind: 'risk',
      entity: 'risk',
      label: '合同法律条款复杂',
      fields: {
        title: '合同法律条款复杂，违约责任多',
        riskType: '回款风险',
        severity: 'low',
        probability: 0.5,
        impact: 0.4,
        mitigation: '法务复核关键条款，建立违约台账定期回顾',
        mitigationStatus: '未制定',
        status: 'open',
        source: 'rule'
      },
      reason: `合同含 ${riskWordCount} 处"风险"、${breachCount} 处"违约"条款`,
      confidence: 0.65
    })
  }

  // 4. 保密 / 知识产权 / 源代码 → 提取并提示
  if (/保密|保密义务|保密期/.test(text)) {
    fields.confidentiality = '合同含保密条款'
    out.push({
      id: 'risk_confidentiality',
      kind: 'risk',
      entity: 'risk',
      label: '合同含保密义务',
      fields: {
        title: '合同含保密义务，需落实保密管理',
        riskType: '技术风险',
        severity: 'low',
        probability: 0.4,
        impact: 0.5,
        mitigation: '项目成员签署保密承诺，文档分级管理',
        mitigationStatus: '未制定',
        status: 'open',
        source: 'rule'
      },
      reason: '合同文本中检测到"保密/保密义务/保密期"',
      confidence: 0.6
    })
  }
  if (/源代码|知识产权|版权|著作权/.test(text)) {
    fields.intellectualProperty = '合同含源代码/知识产权条款'
  }

  // 5. 质保 / 培训 / 维护 → 提示服务期
  if (/质保|保修|维护期/.test(text)) {
    fields.warrantyService = '合同含质保/维护条款'
  }
  if (/培训/.test(text)) {
    fields.trainingService = '合同含培训条款'
  }

  // 6. 项目团队 → 提取人员配置
  const teamMatch = text.match(/(?:项目组|核心人员|项目团队)[：:\s]*([^\n]{0,200})/)
  if (teamMatch) {
    fields.teamConfig = teamMatch[0]
  }

  // 7. 通用未决/模糊（之前漏的）→ 兜底
  if (/未决|待定|TODO|TBD|暂定|未明确|待解决|待定项/.test(text)) {
    out.push({
      id: 'risk_unresolved',
      kind: 'risk',
      entity: 'risk',
      label: '合同存在未决事项',
      fields: {
        title: '合同存在未决事项',
        riskType: '范围风险',
        severity: 'medium',
        probability: 0.6,
        impact: 0.5,
        mitigation: '逐项跟踪未决事项并设定解决时限',
        mitigationStatus: '未制定',
        status: 'open',
        source: 'rule'
      },
      reason: '合同中检测到"未决/待定/TODO"等表述',
      confidence: 0.7
    })
  }
  if (/未评审|待评审|评审中/.test(text)) {
    out.push({
      id: 'risk_review_pending',
      kind: 'risk',
      entity: 'risk',
      label: '合同存在未评审条款',
      fields: {
        title: '合同存在未评审/待评审条款',
        riskType: '范围风险',
        severity: 'low',
        probability: 0.5,
        impact: 0.4,
        mitigation: '组织相关方评审未确定条款',
        mitigationStatus: '未制定',
        status: 'open',
        source: 'rule'
      },
      reason: '合同中检测到"未评审/待评审"表述',
      confidence: 0.6
    })
  }
  if (/首次|第一次|不熟悉|自研|全新/.test(text) && /技术|开发|架构/.test(text)) {
    out.push({
      id: 'risk_tech_new',
      kind: 'risk',
      entity: 'risk',
      label: '合同涉及新技术',
      fields: {
        title: '合同涉及新技术/首次使用',
        riskType: '技术风险',
        severity: 'medium',
        probability: 0.6,
        impact: 0.6,
        mitigation: '开展技术预研/POC 验证，储备备选方案',
        mitigationStatus: '未制定',
        status: 'open',
        source: 'rule'
      },
      reason: '合同中检测到"首次/新技术"等技术相关表述',
      confidence: 0.55
    })
  }

  // 8. 大量交付物 → 交付管理风险
  const deliverCount = (text.match(/交付/g) || []).length
  if (deliverCount >= 10) {
    out.push({
      id: 'risk_deliver_density',
      kind: 'risk',
      entity: 'risk',
      label: '合同交付条款密集',
      fields: {
        title: '合同交付条款密集',
        riskType: '交付质量风险',
        severity: 'low',
        probability: 0.5,
        impact: 0.5,
        mitigation: '建立交付物清单和交付节奏表',
        mitigationStatus: '未制定',
        status: 'open',
        source: 'rule'
      },
      reason: `合同中出现 ${deliverCount} 处"交付"`,
      confidence: 0.6
    })
  }

  // ===== 合同关键要素抽取（实施风险判断基线）=====
  out.push(...extractContractElements(text, out))

  return out
}

// ===== 合同关键要素抽取 =====
// 用户核心需求：金额 / 关键节点 / 关键事项 / 功能清单 / 交付物 / 维保 / 关键指标
// 这些要素是后续实施过程判断风险（延期、遗漏、偏移）的关键基线
const ELEMENT_LABELS: Record<string, string> = {
  amount: '合同金额',
  node: '关键节点',
  keyItem: '关键事项',
  feature: '功能清单',
  deliverable: '交付物',
  warranty: '维保',
  metric: '关键指标'
}

function extractContractElements(text: string, existing: Suggestion[]): Suggestion[] {
  const out: Suggestion[] = []
  const used = new Set(existing.map((s) => s.fields?.category || ''))

  const add = (
    category: string,
    content: string,
    detail: string,
    reason: string,
    confidence: number,
    contractId?: string
  ) => {
    const label = ELEMENT_LABELS[category] || category
    out.push({
      id: `elem_${category}_${out.length + 1}`,
      kind: 'element',
      entity: 'contractElement',
      label: `${label}：${content.slice(0, 26)}`,
      fields: {
        category,
        content: content.slice(0, 200),
        detail: detail.slice(0, 200),
        contractId: contractId || undefined,
        status: 'pending',
        confidence
      },
      reason,
      confidence
    })
  }

  // 1. 合同金额（多格式：万/元/万元整）
  const amtRe = /(?:合同金额|合同总价|合同价款|项目金额|总金额|合同价格)[：:]\s*([0-9,，.]+(?:\s*万元|\s*元)?)/g
  const amtList: string[] = []
  for (const m of text.matchAll(amtRe)) {
    const v = m[1].replace(/[，,]/g, '')
    if (!amtList.includes(v)) amtList.push(v)
  }
  for (const v of amtList.slice(0, 2)) {
    add('amount', `合同金额 ${v}`, `抽取自：${v}`, `匹配到金额 "${v}"`, 0.85)
  }

  // 2. 关键节点（付款/交付/上线/验收/里程碑 + 时间/比例）
  const nodeRe = /(?:付款|支付|交付|上线|验收|里程碑|结项)[^。\n]{0,50}?(?:%|％|日前|日内|月内|个月内|工作日内|节点)/g
  let nodeIdx = 0
  const nodeSeen = new Set<string>()
  for (const m of text.matchAll(nodeRe)) {
    const s = m[0].trim()
    if (s.length > 8 && !nodeSeen.has(s)) {
      nodeSeen.add(s)
      nodeIdx++
      if (nodeIdx > 6) break
      add('node', s, '付款/交付/验收节点', `检测到关键节点：${s.slice(0, 40)}`, 0.7)
    }
  }

  // 3. 关键事项（须/必须/应/不得/严禁 的义务性条款）
  const dutyRe = /(?:乙方|甲方|乙方应|甲方应|供应商|受托方)[^。\n]{0,30}?(?:须|必须|应|不得|严禁|负责|应当在|于)[^。\n]{0,50}。/g
  let dutyIdx = 0
  const dutySeen = new Set<string>()
  for (const m of text.matchAll(dutyRe)) {
    const s = m[0].trim()
    if (s.length > 12 && !dutySeen.has(s)) {
      dutySeen.add(s)
      dutyIdx++
      if (dutyIdx > 8) break
      add('keyItem', s, '合同义务性要求', `检测到关键事项：${s.slice(0, 40)}`, 0.6)
    }
  }

  // 4. 功能清单（功能/模块/系统支持/包含功能）
  const featRe = /(?:功能|模块|子系统|系统支持)[^。\n]{0,40}?(?:包括|包含|如下|实现|支持|提供)[^。\n]{0,60}/g
  let featIdx = 0
  const featSeen = new Set<string>()
  for (const m of text.matchAll(featRe)) {
    const s = m[0].trim()
    if (s.length > 10 && !featSeen.has(s)) {
      featSeen.add(s)
      featIdx++
      if (featIdx > 6) break
      add('feature', s, '功能范围', `检测到功能范围：${s.slice(0, 40)}`, 0.6)
    }
  }

  // 5. 交付物（交付物/提交物/成果/文档交付）
  const delivRe = /(?:交付物|提交物|成果物|提交|交付)[^。\n]{0,40}?(?:文档|报告|清单|系统|源码|手册|方案)[^。\n]{0,50}/g
  let delivIdx = 0
  const delivSeen = new Set<string>()
  for (const m of text.matchAll(delivRe)) {
    const s = m[0].trim()
    if (s.length > 10 && !delivSeen.has(s)) {
      delivSeen.add(s)
      delivIdx++
      if (delivIdx > 6) break
      add('deliverable', s, '交付物', `检测到交付物：${s.slice(0, 40)}`, 0.6)
    }
  }

  // 6. 维保（质保/维护/维保/保修 + 期限）
  const warRe = /(?:质保|维保|维护|保修|维护期|质保期)[^。\n]{0,40}(?:年|月|日|天|期间|期内|期限|免费)[^。\n]{0,30}/g
  let warIdx = 0
  const warSeen = new Set<string>()
  for (const m of text.matchAll(warRe)) {
    const s = m[0].trim()
    if (s.length > 8 && !warSeen.has(s)) {
      warSeen.add(s)
      warIdx++
      if (warIdx > 4) break
      add('warranty', s, '质保/维保条款', `检测到维保条款：${s.slice(0, 40)}`, 0.65)
    }
  }

  // 7. 关键指标（性能/可用性/并发/响应时间/指标/率）
  const metRe = /(?:性能指标|关键指标|指标|可用性|并发|响应时间|成功率|准确率|稳定性|SLA)[^。\n]{0,50}(?:%|％|秒|分钟|毫秒|用户|以上|以内|不低于|不低于)[^。\n]{0,30}/g
  let metIdx = 0
  const metSeen = new Set<string>()
  for (const m of text.matchAll(metRe)) {
    const s = m[0].trim()
    if (s.length > 8 && !metSeen.has(s)) {
      metSeen.add(s)
      metIdx++
      if (metIdx > 6) break
      add('metric', s, '关键指标', `检测到关键指标：${s.slice(0, 40)}`, 0.65)
    }
  }

  return out
}

// ===== 需求文档分析 =====
function analyzeRequirement(text: string): Suggestion[] {
  const out: Suggestion[] = []
  const lines = text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
  let count = 0

  for (const line of lines) {
    const m = line.match(/REQ[-_ ]?(\d+)/i)
    const isReqLine = m || (/需求[：:]/.test(line) && line.length < 120)
    if (isReqLine) {
      count++
      if (count <= 5) {
        const priority = (line.match(/优先级[：:]\s*(高|中|低)/) || [])[1] || '中'
        const rawTitle = line.replace(/^.*需求[：:]\s*/, '').slice(0, 60)
        const title = rawTitle || `需求条目 ${count}`
        out.push({
          id: `inst_req_${count}`,
          kind: 'instance',
          entity: 'requirement',
          label: `创建需求实例：${title}`,
          fields: {
            reqNo: m ? `REQ-${m[1]}` : `REQ-${String(count).padStart(3, '0')}`,
            title,
            priority,
            status: '草稿',
            source: '需求文档',
            changeCount: 0,
            isConfirmed: false
          },
          reason: `检测到需求条目：${line.slice(0, 60)}`,
          confidence: 0.7
        })
      }
    }
  }

  const change = text.match(/变更[^。\n]*?(\d+)\s*次/)
  if (change && parseInt(change[1], 10) > 3) {
    out.push({
      id: 'risk_req_spread',
      kind: 'risk',
      entity: 'risk',
      label: '需求蔓延（变更超阈值）',
      fields: {
        title: '需求蔓延（变更超阈值）',
        riskType: '范围风险',
        severity: 'medium',
        probability: 0.6,
        impact: 0.6,
        mitigation: '冻结需求基线，变更走审批流',
        mitigationStatus: '未制定',
        status: 'open',
        source: 'rule'
      },
      reason: `文档中变更次数 ${change[1]} 超过 3 次阈值`,
      confidence: 0.8
    })
  }
  if (/新增|追加|变更需求|范围外/.test(text)) {
    out.push({
      id: 'risk_req_scope',
      kind: 'risk',
      entity: 'risk',
      label: '存在需求蔓延信号',
      fields: {
        title: '存在需求蔓延信号',
        riskType: '范围风险',
        severity: 'low',
        probability: 0.5,
        impact: 0.4,
        mitigation: '评估新增需求是否超出合同范围，必要时走变更流程',
        mitigationStatus: '未制定',
        status: 'open',
        source: 'rule'
      },
      reason: '文档中出现"新增/追加/范围外"表述',
      confidence: 0.6
    })
  }
  return out
}

// ===== 功能清单分析 =====
function analyzeFeatureList(text: string): Suggestion[] {
  const out: Suggestion[] = []
  const countMatch = text.match(/功能[^。\n]{0,20}?(\d+)\s*(个|项|条)/)
  const lineCount = text.split(/\n+/).filter((l) => l.trim()).length
  const count = countMatch ? parseInt(countMatch[1], 10) : lineCount

  if (count > 50) {
    out.push({
      id: 'risk_feature_big',
      kind: 'risk',
      entity: 'risk',
      label: '功能清单过大',
      fields: {
        title: '功能清单过大',
        riskType: '交付质量风险',
        severity: 'medium',
        probability: 0.6,
        impact: 0.5,
        mitigation: '按优先级裁剪功能范围，冻结基线',
        mitigationStatus: '未制定',
        status: 'open',
        source: 'rule'
      },
      reason: `功能点约 ${count} 个，超过 50 阈值`,
      confidence: 0.7
    })
  }
  if (!/优先级|priority/i.test(text)) {
    out.push({
      id: 'risk_feature_noprio',
      kind: 'risk',
      entity: 'risk',
      label: '功能清单无优先级标注',
      fields: {
        title: '功能清单无优先级标注',
        riskType: '交付质量风险',
        severity: 'low',
        probability: 0.5,
        impact: 0.4,
        mitigation: '为功能点补充优先级标注（高/中/低）',
        mitigationStatus: '未制定',
        status: 'open',
        source: 'rule'
      },
      reason: '未检测到优先级相关标注',
      confidence: 0.6
    })
  }
  return out
}

// ===== 项目范围分析 =====
function analyzeScope(text: string): Suggestion[] {
  const out: Suggestion[] = []
  if (/模糊|待定|TBD|暂定|未明确|不清晰/.test(text)) {
    out.push({
      id: 'risk_scope_vague',
      kind: 'risk',
      entity: 'risk',
      label: '项目范围定义模糊',
      fields: {
        title: '项目范围定义模糊',
        riskType: '范围风险',
        severity: 'medium',
        probability: 0.65,
        impact: 0.6,
        mitigation: '与客户确认范围边界，形成范围基线文档',
        mitigationStatus: '未制定',
        status: 'open',
        source: 'rule'
      },
      reason: '范围文本包含"模糊/待定/未明确"等表述',
      confidence: 0.75
    })
  }
  return out
}

// ===== 技术方案分析 =====
function analyzeTech(text: string): Suggestion[] {
  const out: Suggestion[] = []
  if (/未评审|待评审|评审中/.test(text)) {
    out.push({
      id: 'risk_sol_noreview',
      kind: 'risk',
      entity: 'risk',
      label: '技术方案未评审',
      fields: {
        title: '技术方案未评审',
        riskType: '技术风险',
        severity: 'high',
        probability: 0.7,
        impact: 0.7,
        mitigation: '组织技术评审会并形成评审记录',
        mitigationStatus: '未制定',
        status: 'open',
        source: 'rule'
      },
      reason: '检测到"未评审/待评审"表述',
      confidence: 0.8
    })
  }
  if (/首次|第一次|新技术|试用|自研|不熟悉/.test(text)) {
    out.push({
      id: 'risk_tech_new',
      kind: 'risk',
      entity: 'risk',
      label: '技术不成熟风险',
      fields: {
        title: '技术不成熟风险',
        riskType: '技术风险',
        severity: 'medium',
        probability: 0.6,
        impact: 0.6,
        mitigation: '开展技术预研/POC 验证，储备备选方案',
        mitigationStatus: '未制定',
        status: 'open',
        source: 'rule'
      },
      reason: '检测到"新技术/首次使用"表述',
      confidence: 0.65
    })
  }
  if (/未决|待解决|遗留|TODO|TBD/.test(text)) {
    out.push({
      id: 'risk_sol_unresolved',
      kind: 'risk',
      entity: 'risk',
      label: '技术方案存在未决项',
      fields: {
        title: '技术方案存在未决项',
        riskType: '技术风险',
        severity: 'medium',
        probability: 0.6,
        impact: 0.5,
        mitigation: '逐项跟踪未决项并设定解决时限',
        mitigationStatus: '未制定',
        status: 'open',
        source: 'rule'
      },
      reason: '检测到"未决/待解决/TODO"等未决项表述',
      confidence: 0.7
    })
  }
  return out
}

// ===== 通用概念检查：文本提到的概念若本体缺失 → 建议新增类 =====
const CONCEPT_RULES: Array<{
  keyword: string
  clsId: string
  name: string
  code: string
  phase: 'presales' | 'implementation' | 'ops' | 'common'
}> = [
  { keyword: '功能清单', clsId: 'cls_featureList', name: '功能清单', code: 'featureList', phase: 'implementation' },
  { keyword: '产品原型', clsId: 'cls_prototype', name: '产品原型', code: 'prototype', phase: 'implementation' },
  { keyword: '验收标准', clsId: 'cls_acceptanceCriterion', name: '验收标准', code: 'acceptanceCriterion', phase: 'implementation' },
  { keyword: '用户故事', clsId: 'cls_userStory', name: '用户故事', code: 'userStory', phase: 'implementation' }
]

function checkMissingConcepts(text: string, existingClasses: any[]): Suggestion[] {
  const out: Suggestion[] = []
  const codes = new Set(existingClasses.map((c) => c.code))
  for (const rule of CONCEPT_RULES) {
    if (text.includes(rule.keyword) && !codes.has(rule.code)) {
      out.push({
        id: `cls_${rule.code}`,
        kind: 'class',
        entity: 'class',
        label: `新增类：${rule.name}`,
        fields: {
          id: rule.clsId,
          name: rule.name,
          code: rule.code,
          phase: rule.phase,
          description: `从文档中识别的概念：${rule.keyword}`,
          parentId: undefined
        },
        reason: `文档中出现"${rule.keyword}"，当前本体缺少对应类`,
        confidence: 0.55
      })
    }
  }
  return out
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  let doc: any = null
  let content: string = body?.content
  let docType: string = body?.docType || '合同内容'
  let title: string = body?.title || '未命名文档'

  if (body?.documentId) {
    const docs = await listRows('document')
    doc = docs.find((d: any) => d.id === body.documentId)
    if (!doc) {
      throw createError({ statusCode: 404, message: '文档不存在' })
    }
    content = doc.content
    docType = doc.docType || '合同内容'
    title = doc.title || '未命名文档'
  }

  if (!content || !content.trim()) {
    throw createError({ statusCode: 400, message: '缺少文档内容（content 或 documentId）' })
  }

  const typeKey = (docType || '').trim()
  let suggestions: Suggestion[] = []
  if (typeKey.includes('合同')) suggestions = analyzeContract(content)
  else if (typeKey.includes('需求')) suggestions = analyzeRequirement(content)
  else if (typeKey.includes('功能')) suggestions = analyzeFeatureList(content)
  else if (typeKey.includes('范围')) suggestions = analyzeScope(content)
  else if (typeKey.includes('技术') || typeKey.includes('方案')) suggestions = analyzeTech(content)
  else suggestions = [...analyzeContract(content), ...analyzeRequirement(content)]

  // 通用概念缺失检查（所有文档类型都执行）
  suggestions.push(...checkMissingConcepts(content, await listRows('ontology_class')))

  return {
    documentId: doc?.id,
    docType,
    title,
    suggestions
  }
})
