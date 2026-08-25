import { listRows } from '~/server/utils/db'

/**
 * POST /api/rules/scan —— 业务规则引擎
 * 扫描当前项目业务数据，命中预置规则自动生成风险建议（不落库，由前端确认后采纳）。
 *
 * 预置规则（与方案 v0.4 第 4 节 L1 确定性规则层对应）：
 *  R1 里程碑延期 > 7 天 → 进度风险
 *  R2 里程碑逾期未完成（计划完成已过且无实际完成）→ 进度风险
 *  R3 需求变更次数 > 3 → 范围风险（需求蔓延）
 *  R4 方案未评审 → 方案风险
 *  R5 方案存在未决项 → 方案风险
 *  R6 合同无验收条款 → 验收风险
 *  R7 功能清单无需求覆盖 → 遗漏风险
 *  R8 合同要素"金额/关键节点"缺失 → 合同基线风险
 *
 * 去重：若同项目下已存在相同 title + relatedEntityId 的 open 风险，则跳过。
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const projectId = (body.projectId as string) || ''

  if (!projectId) {
    throw createError({ statusCode: 400, message: '请提供 projectId' })
  }

  const out: any[] = []
  const add = (
    id: string,
    title: string,
    riskType: string,
    severity: string,
    probability: number,
    impact: number,
    mitigation: string,
    reason: string,
    confidence: number,
    relatedEntityId?: string
  ) => {
    out.push({
      id: `rule_${id}`,
      kind: 'risk',
      entity: 'risk',
      label: `${riskType}：${title}`,
      fields: {
        title,
        riskType,
        severity,
        probability,
        impact,
        mitigation,
        mitigationStatus: '未制定',
        status: 'open',
        source: 'rule',
        relatedEntityId
      },
      reason,
      confidence
    })
  }

  // 已有 open 风险（去重依据）
  const existing = (listRows('risk', projectId) as any[]) || []
  const seen = new Set(existing.filter((r) => r.status === 'open').map((r) => `${r.title}|${r.relatedEntityId || ''}`))

  // ===== R1 / R2：里程碑延期与逾期 =====
  const milestones = (listRows('milestone', projectId) as any[]) || []
  const today = new Date().toISOString().slice(0, 10)
  for (const m of milestones) {
    // R1 延期 > 7 天
    const delay = Number(m.delayDays || 0)
    if (delay > 7) {
      const key = `${m.name}延期${delay}天|${m.id}`
      if (!seen.has(key)) {
        add(
          `delay_${m.id}`,
          `里程碑「${m.name}」延期 ${delay} 天`,
          '进度风险',
          delay > 14 ? 'high' : 'medium',
          0.8,
          0.7,
          '核查延期原因，调整资源与排期，与甲方同步最新交付时间',
          `里程碑「${m.name}」计划内未按时完成，已延期 ${delay} 天（阈值 > 7 天）`,
          0.85,
          m.id
        )
      }
    }
    // R2 逾期未完成：计划完成已过、无实际完成、状态不是已完成
    const overdue = m.planEnd && m.planEnd < today && !m.actualEnd && m.status !== '已完成'
    if (overdue) {
      const key = `${m.name}逾期未完成|${m.id}`
      if (!seen.has(key)) {
        add(
          `overdue_${m.id}`,
          `里程碑「${m.name}」已逾期未完成（计划 ${m.planEnd}）`,
          '进度风险',
          'high',
          0.85,
          0.7,
          '立即评估完成度，制定追赶计划，必要时上报项目总监',
          `里程碑「${m.name}」计划完成日期 ${m.planEnd} 已过，仍未标记完成`,
          0.8,
          m.id
        )
      }
    }
  }

  // ===== R3：需求蔓延（变更 > 3 次）=====
  const requirements = (listRows('requirement', projectId) as any[]) || []
  for (const r of requirements) {
    const changes = Number(r.changeCount || 0)
    if (changes > 3) {
      const key = `${r.title}变更${changes}次|${r.id}`
      if (!seen.has(key)) {
        add(
          `req_${r.id}`,
          `需求「${r.title}」变更 ${changes} 次，存在需求蔓延风险`,
          '范围风险',
          changes > 5 ? 'high' : 'medium',
          0.75,
          0.6,
          '冻结需求基线，变更走评审流程，评估对工期与成本的影响',
          `需求「${r.title}」累计变更 ${changes} 次（阈值 > 3 次）`,
          0.8,
          r.id
        )
      }
    }
  }

  // ===== R4 / R5：方案未评审 / 存在未决项 =====
  const solutions = (listRows('solution', projectId) as any[]) || []
  for (const s of solutions) {
    if (s.reviewStatus === '未评审') {
      const key = `${s.title}未评审|${s.id}`
      if (!seen.has(key)) {
        add(
          `sol_${s.id}`,
          `方案「${s.title}」尚未评审`,
          '技术风险',
          'medium',
          0.7,
          0.6,
          '尽快组织方案评审，未评审前不进入开发阶段',
          `方案「${s.title}」评审状态为「未评审」`,
          0.8,
          s.id
        )
      }
    }
    if (s.hasUnresolvedItems) {
      const key = `${s.title}存在未决项|${s.id}`
      if (!seen.has(key)) {
        add(
          `solunres_${s.id}`,
          `方案「${s.title}」存在未决项`,
          '技术风险',
          'medium',
          0.65,
          0.65,
          '逐项澄清未决项（接口/数据/权限等），明确责任人与期限',
          `方案「${s.title}」标记存在未决项`,
          0.75,
          s.id
        )
      }
    }
  }

  // ===== R6：合同验收条款缺失 =====
  const contracts = (listRows('contract', projectId) as any[]) || []
  for (const c of contracts) {
    if (!c.hasAcceptanceClause) {
      const key = `${c.contractNo}验收条款缺失|${c.id}`
      if (!seen.has(key)) {
        add(
          `contract_${c.id}`,
          `合同「${c.contractNo}」无明确验收条款`,
          '验收风险',
          'high',
          0.8,
          0.8,
          '补充验收标准与验收流程条款，避免验收争议',
          `合同「${c.contractNo}」hasAcceptanceClause=false，验收标准缺失`,
          0.9,
          c.id
        )
      }
    }
  }

  // ===== R7：功能清单无需求覆盖（对齐遗漏）=====
  const features = (listRows('feature', projectId) as any[]) || []
  const coveredFeatureIds = new Set(requirements.filter((r) => r.featureId).map((r) => r.featureId))
  for (const f of features) {
    if (!coveredFeatureIds.has(f.id)) {
      const key = `${f.name}无需求覆盖|${f.id}`
      if (!seen.has(key)) {
        add(
          `feat_${f.id}`,
          `功能「${f.code || ''} ${f.name}」暂无需求覆盖`,
          '范围风险',
          'medium',
          0.6,
          0.6,
          '补充该功能的需求定义，或确认与甲方需求清单一致',
          `功能「${f.name}」在需求清单中无对应需求（功能对齐遗漏）`,
          0.7,
          f.id
        )
      }
    }
  }

  // ===== R8：合同关键要素缺失（金额/关键节点）=====
  const elements = (listRows('contractElement', projectId) as any[]) || []
  for (const c of contracts) {
    const hasAmount = elements.some((e) => e.category === 'amount' && e.contractId === c.id)
    const hasNode = elements.some((e) => (e.category === 'node' || e.category === 'milestone') && e.contractId === c.id)
    if (!hasAmount || !hasNode) {
      const key = `${c.contractNo}关键要素缺失|${c.id}`
      if (!seen.has(key)) {
        add(
          `elem_${c.id}`,
          `合同「${c.contractNo}」关键要素不完整（${!hasAmount ? '金额' : ''}${!hasAmount && !hasNode ? '/' : ''}${!hasNode ? '关键节点' : ''}）`,
          '合同风险',
          'medium',
          0.6,
          0.7,
          '从合同文档补充抽取金额与关键节点要素，作为实施基线',
          `合同「${c.contractNo}」缺少 ${[!hasAmount && '金额', !hasNode && '关键节点'].filter(Boolean).join('、')} 要素`,
          0.7,
          c.id
        )
      }
    }
  }

  return {
    projectId,
    scannedAt: new Date().toISOString(),
    ruleCount: 8,
    suggestions: out
  }
})
