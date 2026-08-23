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
  kind: 'instance' | 'risk' | 'class'
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
