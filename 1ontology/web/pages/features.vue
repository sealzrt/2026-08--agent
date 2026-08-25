<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { useAppStore } from '~/stores/app'
import { featureConfig } from '~/data/entity-configs'

const app = useAppStore()

const features = ref<any[]>([])
const reqs = ref<any[]>([])
const sols = ref<any[]>([])
const tasks = ref<any[]>([])
const loading = ref(false)

const loadAll = async () => {
  if (!app.currentProjectId) return
  loading.value = true
  try {
    const q = `?projectId=${app.currentProjectId}`
    const [f, r, s, t] = await Promise.all([
      $fetch(`/api/data/feature${q}`),
      $fetch(`/api/data/requirement${q}`),
      $fetch(`/api/data/solution${q}`),
      $fetch(`/api/data/task${q}`)
    ])
    features.value = f
    reqs.value = r
    sols.value = s
    tasks.value = t
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

watch(() => app.currentProjectId, () => loadAll())
onMounted(loadAll)

/** 每个功能的对齐情况（需求/方案/任务 按 featureId 精确关联） */
interface AlignRow {
  feature: any
  reqs: any[]
  sols: any[]
  tasks: any[]
  covered: boolean
}

const alignRows = computed<AlignRow[]>(() => {
  return features.value.map((f) => {
    const r = reqs.value.filter((x) => x.featureId === f.id)
    const s = sols.value.filter((x) => x.featureId === f.id)
    const t = tasks.value.filter((x) => x.featureId === f.id)
    return { feature: f, reqs: r, sols: s, tasks: t, covered: r.length > 0 }
  })
})

const alignStats = computed(() => {
  const total = alignRows.value.length
  const covered = alignRows.value.filter((r) => r.covered).length
  return { total, covered, missing: total - covered, percent: total ? Math.round((covered / total) * 100) : 0 }
})

const priorityType: Record<string, string> = { P0: 'danger', P1: 'warning', P2: 'info' }
</script>

<template>
  <div>
    <!-- 功能清单管理（锚点实体） -->
    <EntityManager :config="featureConfig" />

    <!-- 对齐矩阵：功能 ↔ 需求/方案/任务 -->
    <div class="page-card">
      <div style="display: flex; justify-content: space-between; align-items: center">
        <div>
          <h2 class="page-title">功能对齐矩阵</h2>
          <p class="page-desc">
            按功能模块核对 需求 / 方案 / 任务 的覆盖情况（基于关联关系）。
            未覆盖的需求是实施遗漏风险点 —— 项目计划、产品原型/设计、需求文档都按功能清单对齐。
          </p>
        </div>
        <el-tag :type="alignStats.missing > 0 ? 'warning' : 'success'" size="large">
          覆盖 {{ alignStats.covered }}/{{ alignStats.total }}（{{ alignStats.percent }}%）
          <template v-if="alignStats.missing">· 遗漏 {{ alignStats.missing }}</template>
        </el-tag>
      </div>

      <el-table :data="alignRows" border size="small" v-loading="loading" style="margin-top: 8px">
        <el-table-column label="功能模块" min-width="180">
          <template #default="{ row }">
            <b>{{ row.feature.code }}</b> {{ row.feature.name }}
            <el-tag size="small" :type="priorityType[row.feature.priority] || 'info'" style="margin-left: 6px">
              {{ row.feature.priority || '—' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="需求（✓ 覆盖 / ✗ 遗漏）" min-width="180">
          <template #default="{ row }">
            <el-tag v-if="row.reqs.length" size="small" type="success" style="margin: 2px" v-for="r in row.reqs" :key="r.id">
              {{ r.reqNo }} {{ r.title }}
            </el-tag>
            <el-tag v-else size="small" type="danger">✗ 无对应需求</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="方案" min-width="150">
          <template #default="{ row }">
            <el-tag v-if="row.sols.length" size="small" type="primary" style="margin: 2px" v-for="s in row.sols" :key="s.id">
              {{ s.title }}
            </el-tag>
            <span v-else style="color: #f56c6c">✗ 未覆盖</span>
          </template>
        </el-table-column>
        <el-table-column label="任务" min-width="150">
          <template #default="{ row }">
            <el-tag v-if="row.tasks.length" size="small" style="margin: 2px" v-for="t in row.tasks" :key="t.id">
              {{ t.name }}
            </el-tag>
            <span v-else style="color: #909399">—</span>
          </template>
        </el-table-column>
        <el-table-column label="对齐状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.reqs.length ? 'success' : 'danger'" size="small">
              {{ row.reqs.length ? '✓ 已对齐' : '✗ 遗漏' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
