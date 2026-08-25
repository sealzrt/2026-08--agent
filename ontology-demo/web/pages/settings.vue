<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAppStore } from '~/stores/app'

const app = useAppStore()

const stats = ref<Record<string, number>>({})
const loading = ref(false)
const operating = ref('')

const LABELS: Record<string, string> = {
  project: '项目',
  contract: '合同',
  contract_element: '合同要素',
  risk: '风险',
  requirement: '需求',
  solution: '方案',
  milestone: '里程碑',
  task: '任务',
  progress: '进度',
  document: '文档',
  bid: '售前商机',
  ops_event: '运维事件',
  sla: 'SLA',
  warranty: '质保期',
  stakeholder: '干系人'
}

const totalCount = computed(() => Object.values(stats.value).reduce((a, b) => a + b, 0))

const loadStats = async () => {
  stats.value = await $fetch('/api/system/stats')
}

onMounted(() => {
  loadStats()
})

/** 清空业务数据（保留项目与本体） */
async function clearData() {
  try {
    await ElMessageBox.confirm(
      '将删除全部业务数据（合同/风险/要素/需求/方案/里程碑/文档/售前/运维等），保留项目和本体。此操作不可撤销！',
      '⚠️ 清空业务数据',
      { type: 'warning', confirmButtonText: '确认清空', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  operating.value = 'clear'
  try {
    const res: any = await $fetch('/api/system/clear', { method: 'POST' })
    ElMessage.success(res.message || '已清空')
    loadStats()
    app.loadProjects()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '操作失败')
  } finally {
    operating.value = ''
  }
}

/** 重置数据库（清空所有业务数据与项目，含 demo） */
async function resetDb() {
  try {
    const { value } = await ElMessageBox.prompt(
      '将删除所有业务数据与全部项目（含 demo 示例数据），保留本体结构。\n删除后不可恢复！请输入 RESET 确认：',
      '⚠️ 重置数据库（全删）',
      {
        type: 'warning',
        inputPlaceholder: '输入 RESET',
        confirmButtonText: '确认重置',
        cancelButtonText: '取消'
      }
    )
    if (value !== 'RESET') {
      ElMessage.warning('输入 RESET 才能确认重置')
      return
    }
  } catch {
    return
  }
  operating.value = 'reset'
  try {
    const res: any = await $fetch('/api/system/reset', { method: 'POST' })
    ElMessage.success(res.message || '已重置')
    loadStats()
    // 重置后项目表为空：清空当前项目选择 + 刷新项目列表（否则顶栏残留旧项目）
    app.setCurrentProject('')
    await app.loadProjects()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '操作失败')
  } finally {
    operating.value = ''
  }
}
</script>

<template>
  <div>
    <div class="page-card">
      <h2 class="page-title">数据管理</h2>
      <p class="page-desc">
        查看当前数据库数据量，或执行危险操作（清空业务数据 / 重置数据库）。所有操作不可撤销，请谨慎。
      </p>

      <el-row :gutter="12" v-loading="loading">
        <el-col :span="4" v-for="(v, k) in stats" :key="k">
          <div class="stat-chip">
            <div class="stat-num">{{ v }}</div>
            <div class="stat-label">{{ LABELS[k] || k }}</div>
          </div>
        </el-col>
      </el-row>
      <el-alert
        type="info"
        :closable="false"
        style="margin-top: 12px"
        :title="`当前共 ${totalCount} 条业务数据 · 本体（类/属性/关系）与项目不在上表计数内`"
      />
    </div>

    <div class="page-card">
      <h2 class="page-title">危险操作</h2>
      <p class="page-desc">以下操作不可撤销，执行前需二次确认。</p>

      <div style="display: flex; gap: 16px; flex-wrap: wrap">
        <div class="ops-card">
          <h3 style="margin-bottom: 8px">🧹 清空业务数据</h3>
          <p style="font-size: 13px; color: #909399; margin-bottom: 12px">
            删除合同/风险/要素/需求/方案/里程碑/文档/售前/运维等业务数据，<b>保留项目与本体</b>。
          </p>
          <el-button type="danger" plain :loading="operating === 'clear'" @click="clearData">
            清空业务数据
          </el-button>
        </div>

        <div class="ops-card">
          <h3 style="margin-bottom: 8px">♻️ 重置数据库（全删）</h3>
          <p style="font-size: 13px; color: #909399; margin-bottom: 12px">
            删除<b>所有业务数据与全部项目（含 demo 示例）</b>，保留本体（类/属性/关系）。
            重置后为空系统，可从顶栏「＋ 新建项目」开始。
          </p>
          <el-button type="danger" :loading="operating === 'reset'" @click="resetDb">
            删除所有数据（含 demo）
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-chip {
  background: #f9fafc;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  margin-bottom: 12px;
}

.stat-num {
  font-size: 22px;
  font-weight: 600;
  color: #409eff;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.ops-card {
  flex: 1;
  min-width: 260px;
  background: #f9fafc;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
}
</style>
