<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { useAppStore } from '~/stores/app'
import { Graph } from '@antv/g6'

const app = useAppStore()
const container = ref<HTMLElement | null>(null)
const contracts = ref<any[]>([])
const selectedContractId = ref<string>('')
const loading = ref(false)
const viewMode = ref<'ontology' | 'instance'>('ontology')

// ===================== 本体概念图谱 =====================
const ontology = ref<{ classes: any[]; properties: any[]; relations: any[] }>({
  classes: [], properties: [], relations: []
})
const classInfo = ref<null | { cls: any; props: any[]; instanceCount: number }>(null)

// 类 → 业务实体（查询实例数）
const CLASS_ENTITY: Record<string, string> = {
  bid: 'bid', contract: 'contract', project: 'project', plan: 'milestone',
  milestone: 'milestone', task: 'task', progress: 'progress',
  requirement: 'requirement', solution: 'solution', risk: 'risk',
  opsEvent: 'opsEvent', sla: 'sla', warranty: 'warranty',
  stakeholder: 'stakeholder', document: 'document', featureList: 'feature'
}
const PHASE_COLORS: Record<string, string> = {
  presales: '#d85a30',
  implementation: '#185fa5',
  ops: '#0f6e56',
  common: '#5f5e5a'
}
const PHASE_LABELS: Record<string, string> = { presales: '售前', implementation: '实施', ops: '运维', common: '通用' }

async function loadOntology() {
  ontology.value = await $fetch('/api/ontology')
}

async function renderOntologyGraph() {
  if (!container.value || !ontology.value.classes.length) return
  loading.value = true
  try {
    const { classes, relations } = ontology.value
    const nodes = classes.map((c) => ({
      id: c.id,
      data: { kind: 'class', code: c.code },
      style: {
        labelText: c.name,
        labelPlacement: 'bottom',
        labelFontSize: 12,
        fill: PHASE_COLORS[c.phase] || '#888',
        size: 34
      }
    }))
    const edges = relations
      .filter((r) => r.fromClassId && r.toClassId)
      .map((r) => ({
        source: r.fromClassId,
        target: r.toClassId,
        style: { labelText: r.name, labelBackground: true, endArrow: true, labelFontSize: 9 }
      }))

    if (graph) graph.destroy()
    graph = new Graph({
      container: container.value,
      autoFit: 'view',
      data: { nodes, edges },
      node: { style: { labelPlacement: 'bottom' } },
      edge: { style: { endArrow: true, labelFontSize: 9 } },
      layout: { type: 'force', linkDistance: 160, nodeStrength: 400, preventOverlap: true }
    })
    graph.on('node:click', async (evt: any) => {
      const id = evt.target.id
      const cls = classes.find((c) => c.id === id)
      if (!cls) return
      // 类详情：属性 + 当前项目实例数
      const props = ontology.value.properties.filter((p) => p.classId === id)
      let instanceCount = 0
      const entity = CLASS_ENTITY[cls.code]
      if (entity && app.currentProjectId) {
        try {
          const list = await $fetch(`/api/data/${entity}?projectId=${app.currentProjectId}`)
          instanceCount = list.length
        } catch { /* 无实体映射 */ }
      }
      classInfo.value = { cls, props, instanceCount }
    })
    graph.render()
  } catch (e: any) {
    ElMessage.error(e?.message || '本体图谱加载失败')
  } finally {
    loading.value = false
  }
}

// ===================== 项目实例图谱（原功能） =====================
const NODE_COLORS: Record<string, string> = {
  project: '#185fa5', contract: '#0f6e56', requirement: '#d85a30',
  solution: '#7f77dd', risk: '#e24b4a', milestone: '#ba7517',
  document: '#5f5e5a', element: '#1d9e75'
}
const NODE_LABELS: Record<string, string> = {
  project: '项目', contract: '合同', requirement: '需求', solution: '方案',
  risk: '风险', milestone: '里程碑', document: '文档', element: '合同要素'
}

let graph: any = null

const loadContracts = async () => {
  // 只查当前项目下的合同（避免旧合同出现在新项目下拉）
  if (!app.currentProjectId) { contracts.value = []; return }
  contracts.value = await $fetch(`/api/data/contract?projectId=${app.currentProjectId}`)
  // 默认选中第一个（首次或当前选中已不在新项目时）
  if (!selectedContractId.value || !contracts.value.find((c) => c.id === selectedContractId.value)) {
    selectedContractId.value = contracts.value[0]?.id || ''
  }
}

async function renderInstanceGraph() {
  if (!container.value) return
  const pid = app.currentProjectId
  if (!pid) {
    ElMessage.warning('请先在顶栏选择「当前项目」')
    return
  }
  loading.value = true
  try {
    const [contractsData, reqs, sols, risks, milestones, docs, elements] = await Promise.all([
      $fetch(`/api/data/contract?projectId=${pid}`),
      $fetch(`/api/data/requirement?projectId=${pid}`),
      $fetch(`/api/data/solution?projectId=${pid}`),
      $fetch(`/api/data/risk?projectId=${pid}`),
      $fetch(`/api/data/milestone?projectId=${pid}`),
      $fetch(`/api/data/document?projectId=${pid}`),
      $fetch(`/api/data/contractElement?projectId=${pid}`)
    ])
    const project = app.projects.find((p) => p.id === pid)

    const nodes: any[] = []
    const edges: any[] = []
    const nodeIds = new Set<string>()
    const addNode = (id: string, label: string, type: string) => {
      if (nodeIds.has(id)) return
      nodeIds.add(id)
      nodes.push({
        id,
        data: { type },
        style: {
          labelText: label,
          labelPlacement: 'bottom',
          fill: NODE_COLORS[type] || '#888',
          size: type === 'project' ? 36 : 26
        }
      })
    }
    const addEdge = (source: string, target: string, label: string) => {
      edges.push({ source, target, style: { labelText: label, labelBackground: true } })
    }

    if (project) addNode(project.id, project.name, 'project')

    const targetContracts = selectedContractId.value
      ? contractsData.filter((c: any) => c.id === selectedContractId.value)
      : contractsData
    for (const c of targetContracts) {
      addNode(c.id, `${c.contractNo}`, 'contract')
      addEdge(project.id, c.id, '约束')
    }

    for (const r of reqs) { addNode(r.id, r.title?.slice(0, 14) || '需求', 'requirement'); addEdge(project.id, r.id, '包含') }
    for (const s of sols) { addNode(s.id, s.title?.slice(0, 14) || '方案', 'solution'); addEdge(project.id, s.id, '包含') }
    for (const r of risks) { addNode(r.id, r.title?.slice(0, 14) || '风险', 'risk'); addEdge(project.id, r.id, '风险') }
    for (const m of milestones) { addNode(m.id, m.name?.slice(0, 12) || '里程碑', 'milestone'); addEdge(project.id, m.id, '计划') }
    for (const d of docs) { addNode(d.id, d.title?.slice(0, 12) || '文档', 'document'); addEdge(project.id, d.id, '文档') }

    for (const e of elements) {
      const parent = e.contractId || targetContracts[0]?.id || project.id
      addNode(e.id, `${e.category}:${(e.content || '').slice(0, 10)}`, 'element')
      addEdge(parent, e.id, '要素')
    }

    if (graph) graph.destroy()
    graph = new Graph({
      container: container.value,
      autoFit: 'view',
      data: { nodes, edges },
      node: { style: { labelPlacement: 'bottom', labelFontSize: 11 } },
      edge: { style: { endArrow: true, labelFontSize: 9 } },
      layout: { type: 'force', linkDistance: 120, nodeStrength: 300, preventOverlap: true }
    })
    graph.on('node:click', (evt: any) => {
      const id = evt.target.id
      const d = nodes.find((n) => n.id === id)
      if (d) ElMessage.info(`${NODE_LABELS[d.data.type] || d.data.type}：${(d.style.labelText || id).toString()}`)
    })
    graph.render()
  } catch (e: any) {
    ElMessage.error(e?.message || '图谱加载失败')
  } finally {
    loading.value = false
  }
}

// ===================== 响应式：项目切换 + 视图切换 + 合同选择 =====================
watch(
  () => app.currentProjectId,
  async () => {
    // 项目切换时重载合同列表 + 重置选中的合同
    await loadContracts()
    await nextTick()
    renderGraphForCurrentMode()
  }
)
watch(viewMode, () => renderGraphForCurrentMode())
watch(selectedContractId, () => {
  if (viewMode.value === 'instance') renderInstanceGraph()
})

function renderGraphForCurrentMode() {
  if (viewMode.value === 'ontology') renderOntologyGraph()
  else renderInstanceGraph()
}

onMounted(async () => {
  await app.loadProjects()
  await loadOntology()
  await loadContracts()
  await nextTick()
  renderGraphForCurrentMode()
})
</script>

<template>
  <div>
    <div class="page-card">
      <h2 class="page-title">本体关系图谱</h2>
      <p class="page-desc">
        <b>本体概念图谱</b>：17 个类（本体结构）及类间关系，点击类节点查看其属性与当前项目的实例数量；
        <b>项目实例图谱</b>：以项目为根、合同为中心的实例关系图。
      </p>

      <el-tabs v-model="viewMode">
        <el-tab-pane label="🧬 本体概念图谱" name="ontology" />
        <el-tab-pane label="🕸️ 项目实例图谱" name="instance" />
      </el-tabs>

      <!-- 本体视图工具条 -->
      <div v-if="viewMode === 'ontology'" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap">
        <el-tag v-for="(c, k) in PHASE_COLORS" :key="k" size="small" :color="c" style="color: #fff; border: none">
          {{ PHASE_LABELS[k] }}阶段
        </el-tag>
        <el-tag size="small" type="info">{{ ontology.classes.length }} 个类 · {{ ontology.relations.length }} 条关系</el-tag>
        <span style="color: #909399; font-size: 12px">点击类节点 → 查看属性与实例数</span>
      </div>

      <!-- 实例视图工具条 -->
      <div v-else style="display: flex; gap: 12px; align-items: center">
        <el-select v-model="selectedContractId" placeholder="选择合同（聚焦）" clearable style="width: 320px">
          <el-option v-for="c in contracts" :key="c.id" :label="`${c.contractNo}（${c.amount ? '¥' + Number(c.amount).toLocaleString() : ''}）`" :value="c.id" />
        </el-select>
        <el-button type="primary" @click="renderInstanceGraph" :loading="loading">渲染图谱</el-button>
        <el-tag v-for="(c, k) in NODE_COLORS" :key="k" size="small" :color="c" style="color: #fff; border: none">
          {{ NODE_LABELS[k] }}
        </el-tag>
      </div>
    </div>

    <div class="page-card">
      <!-- 类详情信息（本体视图点击类后显示） -->
      <div v-if="viewMode === 'ontology' && classInfo" class="class-info">
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="类">
            <el-tag size="small" :color="PHASE_COLORS[classInfo.cls.phase] || '#888'" style="color: #fff; border: none">
              {{ classInfo.cls.name }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="阶段">{{ PHASE_LABELS[classInfo.cls.phase] || classInfo.cls.phase }}</el-descriptions-item>
          <el-descriptions-item label="当前项目实例">
            <b>{{ classInfo.instanceCount }}</b> 个
          </el-descriptions-item>
          <el-descriptions-item label="说明" :span="3">{{ classInfo.cls.description || '—' }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="classInfo.props.length" style="margin-top: 8px">
          <b style="font-size: 13px">属性（{{ classInfo.props.length }}）：</b>
          <el-tag v-for="p in classInfo.props" :key="p.id" size="small" style="margin: 2px">
            {{ p.name }}{{ p.required ? '*' : '' }}
          </el-tag>
        </div>
      </div>
      <div ref="container" style="height: 560px; border: 1px solid #ebeef5; border-radius: 8px" v-loading="loading" />
    </div>
  </div>
</template>

<style scoped>
.class-info {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  background: #fafbfc;
  margin-bottom: 12px;
}
</style>
