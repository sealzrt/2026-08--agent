/**
 * 文档自动建模引擎（纯规则，零依赖）——共享核心
 *
 * extractFromText(content, docType) → Suggestion[]
 *   suggestions: 建模/风险建议清单（kind: instance 实例 / risk 风险 / class 新类 / element 合同要素 / feature 功能）
 *   供两个入口复用：
 *    - /api/ontology/extract（手动：前端展示 → 人工确认采纳）
 *    - /api/documents/upload（自动：上传后自动建模并自动采纳要素/功能/实例）
 */

import { listRows } from '~/server/utils/db'

export interface Suggestion {
  id: string
  kind: 'instance' | 'risk' | 'class' | 'element' | 'feature'
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

  // 金额（多格式，按精确度优先级）：
  //  1) ¥ 符号数字：¥1,200,000.00
  //  2) 数字+单位：128 万元 / 1,200,000 元 / 128万
  //  3) 大写金额：壹佰贰拾万元整 / 人民币壹佰贰拾万元整
  let amount: number | null = null
  const yNum = text.match(/(?:¥|￥)\s*([0-9][0-9,，]*(?:\.[0-9]+)?)/)
  if (yNum) amount = parseFloat(yNum[1].replace(/[，,]/g, ''))
  if (amount === null) {
    const numAmt = text.match(/([0-9][0-9,，]*(?:\.[0-9]+)?)\s*(万元|万|元)/)
    if (numAmt) {
      const n = parseFloat(numAmt[1].replace(/[，,]/g, ''))
      amount = numAmt[2].includes('万') ? n * 10000 : n
    }
  }
  if (amount === null) {
    // 大写金额：开头不能是纯单位（避免误匹配"万元整"），整体为 数字+单位 序列后跟"元"
    const cnAmt = text.match(/(?![万千亿])([零一二三四五六七八九十百千万亿]+)元(?:整)?/)
    if (cnAmt) {
      const n = cnNumberToNumber(cnAmt[1])
      if (n) amount = n
    }
  }
  if (amount !== null) fields.amount = amount

  const noMatch = text.match(/(?:合同编号|合同号)[：:]\s*([^\s\n，。]+)/)
  if (noMatch) fields.contractNo = noMatch[1]

  const scopeMatch = text.match(/[^。\n]*(?:交付范围|项目范围|建设范围|功能范围|项目功能范围|合同范围)[^。\n]*。?/)
  if (scopeMatch) fields.scopeText = scopeMatch[0]

  const dateMatch = text.match(/(?:签订日期|签订时间|合同签订日期|签约日期)[：:]\s*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/)
  if (dateMatch) fields.signedDate = dateMatch[1].replace(/[/.]/g, '-')

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
  milestone: '里程碑',
  keyItem: '关键事项',
  feature: '功能清单',
  deliverable: '交付物',
  warranty: '维保',
  sla: 'SLA 响应时效',
  metric: '关键指标',
  training: '培训'
}

/** 中文数字 → 阿拉伯数字（支持 壹佰贰拾万 / 一百二十万 等） */
const CN_NUM: Record<string, number> = {
  零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
  壹: 1, 贰: 2, 叁: 3, 肆: 4, 伍: 5, 陆: 6, 柒: 7, 捌: 8, 玖: 9
}
const CN_UNIT: Record<string, number> = {
  十: 10, 拾: 10, 百: 100, 佰: 100, 千: 1000, 仟: 1000, 万: 10000, 萬: 10000
}

function cnNumberToNumber(s: string): number | null {
  let total = 0
  let section = 0
  let num = 0
  for (const ch of s) {
    if (ch in CN_NUM) num = CN_NUM[ch]
    else if (ch in CN_UNIT) {
      const unit = CN_UNIT[ch]
      if (unit === 10000) {
        const base = section + num
        section = (base > 0 ? base : 1) * unit
        total += section
        section = 0
        num = 0
      } else {
        section += (num === 0 && unit === 10 ? 1 : num) * unit
        num = 0
      }
    }
  }
  return total + section + num
}

/** 日期归一化：2026.09.01 / 2026/9/1 → 2026-09-01 */
function normalizeDate(s: string): string {
  const m = s.match(/(20\d{2})[./-](\d{1,2})[./-](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  return s
}

/** 降噪：过滤模板免责声明等噪音行 */
function isNoise(s: string): boolean {
  return /虚构|声明|免责|不代表|仅用于|演示|模板演示/.test(s)
}

function extractContractElements(text: string, existing: Suggestion[]): Suggestion[] {
  const out: Suggestion[] = []

  const add = (
    category: string,
    content: string,
    detail: string,
    reason: string,
    confidence: number,
    extraFields?: Record<string, unknown>,
    contractId?: string
  ) => {
    if (isNoise(content) || isNoise(reason)) return
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
        confidence,
        ...extraFields
      },
      reason,
      confidence
    })
  }

  // ========== 1. 合同金额（数字格式 + 大写格式）==========
  // 1a. 数字格式：¥1,200,000.00 / 1,200,000 / 120万元
  const amtNumRe =
    /(?:合同金额|合同总金额|合同总价|合同价款|项目金额|开发总费用|总费用|总金额|合同价格|人民币)[：:为是]\s*[¥￥]?\s*([0-9][0-9,，.]+)/g
  for (const m of text.matchAll(amtNumRe)) {
    const raw = m[1].replace(/[，,]/g, '')
    const num = parseFloat(raw)
    if (num > 1000 && !isNoise(m[0])) {
      add('amount', `合同金额 ¥${num.toLocaleString()}`, `抽取自：${m[0].slice(0, 40)}`, `匹配到金额 "${raw}"`, 0.85)
      break
    }
  }
  // 1b. 中文大写：壹佰贰拾万元整
  const amtCnRe = /(?:开发总费用|总费用|合同金额|合同总金额|总金额|人民币)[^。\n]{0,12}?([零一二三四五六七八九十百千万亿壹贰叁肆伍陆柒捌玖拾佰仟萬]+元(?:整)?)/g
  for (const m of text.matchAll(amtCnRe)) {
    const cn = m[1].replace(/元整?$/, '')
    const num = cnNumberToNumber(cn)
    if (num && num > 1000 && !isNoise(m[0])) {
      add('amount', `合同金额 ${num.toLocaleString()} 元（${m[1]}）`, `抽取自：${m[0].slice(0, 40)}`, `匹配到中文大写金额 "${m[1]}"`, 0.9)
      break
    }
  }

  // ========== 2. 关键节点（付款/交付/上线/验收 + 第N期付款表格）==========
  const nodeRe =
    /(?:付款|支付|交付|上线|验收|里程碑|结项|第[一二三四五六七八九十]期|预付款|需求确认款|开发中期款|上线验收款|质保尾款|尾款|中期款)[^。\n]{0,50}?(?:%|％|日前|日内|月内|个月内|工作日内|节点|工作日内)/g
  let nodeIdx = 0
  const nodeSeen = new Set<string>()
  for (const m of text.matchAll(nodeRe)) {
    const s = m[0].trim()
    if (s.length > 8 && !nodeSeen.has(s) && !isNoise(s)) {
      nodeSeen.add(s)
      nodeIdx++
      if (nodeIdx > 10) break
      add('node', s, '付款/交付/验收节点', `检测到关键节点：${s.slice(0, 40)}`, 0.7)
    }
  }

  // ========== 3. 里程碑（MS\d+ 表格行，含起止日期）==========
  const msRe =
    /MS\d+[^。\n]{0,40}?(20\d{2}[./-]\d{1,2}[./-]\d{1,2})[^。\n]{0,12}?(?:–|—|~|至|-)[^。\n]{0,12}?(20\d{2}[./-]\d{1,2}[./-]\d{1,2})/g
  const msSeen = new Set<string>()
  for (const m of text.matchAll(msRe)) {
    const s = m[0].trim()
    if (!msSeen.has(s) && !isNoise(s)) {
      msSeen.add(s)
      add(
        'milestone',
        s,
        `起：${normalizeDate(m[1])} 至 ${normalizeDate(m[2])}`,
        `检测到里程碑（含起止日期）`,
        0.8,
        { planStart: normalizeDate(m[1]), planEnd: normalizeDate(m[2]) }
      )
    }
  }

  // ========== 4. 关键事项（义务性条款）==========
  const dutyRe = /(?:乙方|甲方|乙方应|甲方应|供应商|受托方)[^。\n]{0,30}?(?:须|必须|应|不得|严禁|负责|应当在|于)[^。\n]{0,50}。/g
  let dutyIdx = 0
  const dutySeen = new Set<string>()
  for (const m of text.matchAll(dutyRe)) {
    const s = m[0].trim()
    if (s.length > 12 && !dutySeen.has(s) && !isNoise(s)) {
      dutySeen.add(s)
      dutyIdx++
      if (dutyIdx > 10) break
      add('keyItem', s, '合同义务性要求', `检测到关键事项：${s.slice(0, 40)}`, 0.6)
    }
  }

  // ========== 5. 功能清单（M\d+ 模块表格行）→ 独立功能实体（对齐锚点）==========
  // 兼容多种来源格式：
  //  A. Markdown 表格：  | M01 | 用户与权限管理 | 多角色权限... | P0 |
  //  B. Word(docx) 表格：mammoth 解析后为多空格分隔，无 |  →  M01    用户与权限管理    多角色权限...    P0
  //  C. 编号列表：          M01 用户与权限管理 ...
  // 用 (?:\s+|\|) 兼容空格 / Tab / | 分隔
  const mRe = /(?:^|\n)\s*(M\d+)\s+([^\s|：]{2,20})(?:\s+|\|)([^\n|]{2,200}?)(?:\s+(P[0-2])\b|\s*$|\n)/gm
  const featSeen = new Set<string>()
  for (const m of text.matchAll(mRe)) {
    const code = m[1].trim()
    const name = m[2].trim()
    const desc = m[3].trim()
    const prio = m[4] || 'P2'
    if (!featSeen.has(name) && !/验收/.test(name + desc)) {
      featSeen.add(name)
      out.push({
        id: `feat_${code}_${name}`,
        kind: 'feature',
        entity: 'feature',
        label: `功能：${code} ${name}（${prio}）`,
        fields: {
          code,
          name,
          description: desc,
          priority: prio,
          status: '未开始',
          source: 'rule'
        },
        reason: `检测到功能模块：${name}`,
        confidence: 0.8
      })
    }
  }
  // 老规则兜底（无 M 表格时的功能描述，作为合同要素记录）
  const featRe = /(?:功能|模块|子系统|系统支持)[^。\n]{0,40}?(?:包括|包含|如下|实现|支持|提供)[^。\n]{0,60}/g
  let featIdx = 0
  const featSeen2 = new Set<string>()
  for (const m of text.matchAll(featRe)) {
    const s = m[0].trim()
    if (s.length > 10 && !featSeen2.has(s) && !/验收标准|P[0-2]功能|100%/.test(s) && !isNoise(s)) {
      featSeen2.add(s)
      featIdx++
      if (featIdx > 6) break
      add('feature', s, '功能范围', `检测到功能范围：${s.slice(0, 40)}`, 0.6)
    }
  }

  // ========== 6. 交付物（序号 + 《书名号》表格行）==========
  const delivTableRe = /[|]\s*\d+\s*[|]\s*《([^》]{2,30})》[^|]*[|]/g
  const delivSeen = new Set<string>()
  for (const m of text.matchAll(delivTableRe)) {
    const name = m[1].trim()
    if (!delivSeen.has(name) && !isNoise(name)) {
      delivSeen.add(name)
      add('deliverable', `《${name}》`, '交付物（表格）', `检测到交付物：${name}`, 0.8)
    }
  }
  // 老规则兜底
  const delivRe = /(?:交付物|提交物|成果物|提交|交付)[^。\n]{0,40}?(?:文档|报告|清单|系统|源码|手册|方案)[^。\n]{0,50}/g
  let delivIdx = 0
  const delivSeen2 = new Set<string>()
  for (const m of text.matchAll(delivRe)) {
    const s = m[0].trim()
    if (s.length > 10 && !delivSeen2.has(s) && !isNoise(s)) {
      delivSeen2.add(s)
      delivIdx++
      if (delivIdx > 6) break
      add('deliverable', s, '交付物', `检测到交付物：${s.slice(0, 40)}`, 0.6)
    }
  }

  // ========== 7. 维保（质保/维护 + 期限）==========
  const warRe = /(?:质保|维保|维护|保修|维护期|质保期)[^。\n]{0,40}(?:年|月|日|天|期间|期内|期限|免费)[^。\n]{0,30}/g
  let warIdx = 0
  const warSeen = new Set<string>()
  for (const m of text.matchAll(warRe)) {
    const s = m[0].trim()
    if (s.length > 8 && !warSeen.has(s) && !isNoise(s)) {
      warSeen.add(s)
      warIdx++
      if (warIdx > 6) break
      add('warranty', s, '质保/维保条款', `检测到维保条款：${s.slice(0, 40)}`, 0.65)
    }
  }

  // ========== 8. SLA 响应时效（S1-S4 故障等级表）==========
  const slaRe =
    /(?:S1|S2|S3|S4)[^。\n]{0,40}(?:30分钟|2小时|4小时|8小时|1个工作日|3个工作日|5个工作日)[^。\n]{0,40}(?:恢复|修复|解决)/g
  const slaSeen = new Set<string>()
  for (const m of text.matchAll(slaRe)) {
    const s = m[0].trim()
    if (!slaSeen.has(s) && !isNoise(s)) {
      slaSeen.add(s)
      add('sla', s, '故障响应时效', `检测到 SLA 响应时效`, 0.75)
    }
  }

  // ========== 9. 关键指标（性能/可用性/并发/响应时间）==========
  const metRe =
    /(?:性能指标|关键指标|指标|可用性|并发|响应时间|成功率|准确率|稳定性|SLA)[^。\n]{0,50}(?:%|％|秒|分钟|毫秒|用户|以上|以内|不低于)[^。\n]{0,30}/g
  let metIdx = 0
  const metSeen = new Set<string>()
  for (const m of text.matchAll(metRe)) {
    const s = m[0].trim()
    if (s.length > 8 && !metSeen.has(s) && !isNoise(s)) {
      metSeen.add(s)
      metIdx++
      if (metIdx > 8) break
      add('metric', s, '关键指标', `检测到关键指标：${s.slice(0, 40)}`, 0.65)
    }
  }

  // ========== 10. 培训 ==========
  const trainRe = /(?:培训)[^。\n]{0,30}(?:不少于|不低于)?\s*[0-9一二三四五六七八九十]+\s*次[^。\n]{0,40}/g
  const trainSeen = new Set<string>()
  for (const m of text.matchAll(trainRe)) {
    const s = m[0].trim()
    if (!trainSeen.has(s) && !isNoise(s)) {
      trainSeen.add(s)
      add('training', s, '培训要求', `检测到培训条款`, 0.7)
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

/** 按文档类型分发分析，返回建模/风险建议（含通用概念缺失检查） */
export async function extractFromText(
  content: string,
  docType: string
): Promise<Suggestion[]> {
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
  return suggestions
}
