<script setup lang="ts">
import { useAppStore } from '~/stores/app'

const app = useAppStore()

const stats = ref({ elements: 0, risks: 0, milestones: 0, docs: 0, contracts: 0 })
const recentRisks = ref<any[]>([])
const recentElements = ref<any[]>([])
const loading = ref(true)

const currentProject = computed(
  () => app.projects.find((p) => p.id === app.currentProjectId) || null
)

const loadAll = async () => {
  if (!app.currentProjectId) {
    stats.value = { elements: 0, risks: 0, milestones: 0, docs: 0, contracts: 0 }
    recentRisks.value = []
    recentElements.value = []
    loading.value = false
    return
  }
  loading.value = true
  try {
    const q = `?projectId=${app.currentProjectId}`
    const [elements, risks, milestones, docs, contracts] = await Promise.all([
      $fetch(`/api/data/contractElement${q}`),
      $fetch(`/api/data/risk${q}`),
      $fetch(`/api/data/milestone${q}`),
      $fetch(`/api/data/document${q}`),
      $fetch(`/api/data/contract${q}`)
    ])
    stats.value = {
      elements: elements.length,
      risks: risks.length,
      milestones: milestones.length,
      docs: docs.length,
      contracts: contracts.length
    }
    recentRisks.value = risks.slice(0, 5)
    recentElements.value = elements.slice(0, 8)
  } catch {
    /* 忽略 */
  } finally {
    loading.value = false
  }
}

watch(() => app.currentProjectId, () => loadAll())
onMounted(loadAll)

const severityTag = (s: string) =>
  ({ high: 'danger', medium: 'warning', low: 'success' })[s] ?? 'info'

const statusType: Record<string, string> = {
  售前跟进: 'info',
  已签约: 'primary',
  实施中: 'success',
  运维质保: 'warning',
  已关闭: 'info'
}
</script>

<template>
  <div>
    <div class="page-card">
      <h2 class="page-title">项目总览</h2>
      <p class="page-desc">
        以项目为主线的全链路总览：请在顶栏选择「当前项目」，页面将展示该项目的
        合同要素 / 里程碑 / 风险 / 文档等全部信息。
      </p>

      <el-alert
        v-if="!currentProject"
        type="warning"
        :closable="false"
        show-icon
        title="尚未选择项目"
        description="请使用顶栏右上角的「当前项目」下拉选择一个项目（或切换总监视角看全部）。"
      />

      <template v-if="currentProject">
        <el-descriptions :column="4" border size="small" style="margin-top: 12px">
          <el-descriptions-item label="项目名称">{{ currentProject.name }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{ currentProject.customer || '—' }}</el-descriptions-item>
          <el-descriptions-item label="项目经理">{{ currentProject.manager || '—' }}</el-descriptions-item>
          <el-descriptions-item label="生命周期">
            <el-tag :type="statusType[currentProject.status] || 'info'" size="small">
              {{ currentProject.status || '未设置' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </div>

    <div v-if="currentProject">
      <el-row :gutter="16" v-loading="loading">
        <el-col :span="6" v-for="s in [
          { label: '合同', value: stats.contracts, color: '#409eff' },
          { label: '合同要素', value: stats.elements, color: '#67c23a' },
          { label: '里程碑', value: stats.milestones, color: '#e6a23c' },
          { label: '未关闭风险', value: stats.risks, color: '#f56c6c' }
        ]" :key="s.label">
          <div class="stat-card">
            <div class="stat-value" :style="{ color: s.color }">{{ s.value }}</div>
            <div class="stat-label">{{ s.label }}</div>
          </div>
        </el-col>
      </el-row>

      <el-row :gutter="16" style="margin-top: 16px">
        <el-col :span="12">
          <div class="page-card">
            <h3 style="margin-bottom: 12px">最近风险（/risk）</h3>
            <el-table :data="recentRisks" size="small" empty-text="暂无风险">
              <el-table-column prop="title" label="风险" min-width="160" />
              <el-table-column prop="riskType" label="类型" width="90" />
              <el-table-column label="等级" width="70">
                <template #default="{ row }">
                  <el-tag :type="severityTag(row.severity)" size="small">
                    {{ { high: '高', medium: '中', low: '低' }[row.severity] }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="page-card">
            <h3 style="margin-bottom: 12px">合同关键要素（/contract 第2个tab）</h3>
            <el-table :data="recentElements" size="small" empty-text="暂无要素（可在自动识别页从文档抽取）">
              <el-table-column prop="category" label="类别" width="100" />
              <el-table-column prop="content" label="要素内容" min-width="200" />
            </el-table>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  background: #f9fafc;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}
</style>
