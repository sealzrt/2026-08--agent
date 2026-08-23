<script setup lang="ts">
import { useAppStore } from '~/stores/app'

const app = useAppStore()

interface Stat {
  label: string
  value: number
  color: string
}

const stats = ref<Stat[]>([
  { label: '项目总数', value: 0, color: '#409eff' },
  { label: '合同数', value: 0, color: '#67c23a' },
  { label: '需求数', value: 0, color: '#e6a23c' },
  { label: '未关闭风险', value: 0, color: '#f56c6c' }
])

const recentRisks = ref<
  Array<{ id: string; title: string; riskType: string; severity: string; status: string }>
>([])
const loading = ref(true)
const backendOk = ref(true)

onMounted(async () => {
  try {
    const [projects, contracts, risks, requirements] = await Promise.all([
      $fetch('/api/data/project'),
      $fetch('/api/data/contract'),
      $fetch('/api/data/risk'),
      $fetch('/api/data/requirement')
    ])
    const openRisks = risks.filter(
      (r: any) => r.status === 'open' || r.status === 'mitigating'
    )
    stats.value = [
      { label: '项目总数', value: projects.length, color: '#409eff' },
      { label: '合同数', value: contracts.length, color: '#67c23a' },
      { label: '需求数', value: requirements.length, color: '#e6a23c' },
      { label: '未关闭风险', value: openRisks.length, color: '#f56c6c' }
    ]
    recentRisks.value = risks.slice(0, 5)
  } catch {
    backendOk.value = false
  } finally {
    loading.value = false
  }
})

const severityTag = (s: string) => ({ high: 'danger', medium: 'warning', low: 'success' })[s] ?? 'info'
</script>

<template>
  <div>
    <div class="page-card">
      <h2 class="page-title">仪表盘</h2>
      <p class="page-desc">
        当前视角：{{ app.role === 'pm' ? '项目经理（单项目精细管理）' : '项目总监（跨项目风险总览）' }}
        · 数据存储：本地 SQLite（server/data/ontology.db）
      </p>

      <el-alert
        v-if="!backendOk"
        type="error"
        :closable="false"
        show-icon
        title="后端 API 不可用"
        description="请确认已执行 npm run dev 启动 Nuxt 服务（内置 SQLite API）。"
        style="margin-bottom: 16px"
      />

      <el-row :gutter="16" v-loading="loading">
        <el-col v-for="s in stats" :key="s.label" :span="6">
          <div class="stat-card">
            <div class="stat-value" :style="{ color: s.color }">{{ s.value }}</div>
            <div class="stat-label">{{ s.label }}</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <el-row :gutter="16">
      <el-col :span="14">
        <div class="page-card">
          <h3 style="margin-bottom: 12px">最近风险</h3>
          <el-table :data="recentRisks" size="small" empty-text="暂无风险数据">
            <el-table-column prop="title" label="风险" min-width="200" />
            <el-table-column prop="riskType" label="类型" width="100" />
            <el-table-column label="等级" width="80">
              <template #default="{ row }">
                <el-tag :type="severityTag(row.severity)" size="small">
                  {{ { high: '高', medium: '中', low: '低' }[row.severity] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100" />
          </el-table>
        </div>
      </el-col>
      <el-col :span="10">
        <div class="page-card">
          <h3 style="margin-bottom: 12px">M1 骨架进度</h3>
          <el-steps direction="vertical" :active="1" style="margin-top: 8px">
            <el-step title="M1 骨架" description="Nuxt3 + SQLite + 全链路路由（当前）" />
            <el-step title="M2 建模" description="本体建模工作台：类/属性/关系 CRUD" />
            <el-step title="M3 业务" description="合同/计划/进度/需求/方案等业务模块" />
            <el-step title="M4 识别" description="文档中心 + 自动识别流水线 + 风险中心" />
            <el-step title="M5 展示" description="双角色仪表盘 + 关系图谱 + 演示模式" />
          </el-steps>
        </div>
      </el-col>
    </el-row>
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
