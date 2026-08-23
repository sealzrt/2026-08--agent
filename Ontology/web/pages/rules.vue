<template>
  <div class="page-card">
    <h2 class="page-title">规则引擎</h2>
    <p class="page-desc">
      确定性规则层（L1）：扫描当前项目的<b>业务数据</b>，命中预置规则自动生成<b>风险建议</b>。
      规则不落库，由你确认后采纳到风险中心（可控闭环，与自动识别一致）。
    </p>

    <el-alert :type="app.currentProjectId ? 'success' : 'warning'" :closable="false" show-icon style="margin-bottom: 12px">
      <template #title>
        当前项目：<b>{{ currentProjectName || '未选择' }}</b> —— 规则扫描仅针对当前项目的数据。
        <template v-if="!app.currentProjectId">请在顶栏选择项目。</template>
      </template>
    </el-alert>

    <!-- 预置规则列表 -->
    <h3 class="section-title">📋 预置规则（{{ RULES.length }} 条）</h3>
    <el-table :data="RULES" border size="small" stripe style="margin-bottom: 16px">
      <el-table-column prop="code" label="编号" width="70" />
      <el-table-column prop="name" label="规则" width="220">
        <template #default="{ row }">
          <el-tag :type="row.type" size="small">{{ row.tag }}</el-tag>
          <span style="margin-left: 6px">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="condition" label="触发条件" min-width="280" />
      <el-table-column prop="action" label="生成风险" min-width="200" />
    </el-table>

    <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px">
      <el-button type="primary" :loading="scanning" :disabled="!app.currentProjectId" @click="runScan">
        🔍 扫描当前项目风险
      </el-button>
      <el-button v-if="suggestions.length" type="success" @click="applyChecked">
        采纳勾选的 {{ checkedCount }} 条到风险中心
      </el-button>
      <el-tag v-if="suggestions.length" type="info">
        {{ suggestions.length }} 条风险建议 · 依据当前业务数据
      </el-tag>
    </div>

    <!-- 扫描结果 -->
    <el-empty v-if="!suggestions.length && !scanning" description="点击「扫描当前项目风险」运行规则引擎" :image-size="70" />
    <div v-else>
      <el-table :data="suggestions" border size="small" stripe v-loading="scanning">
        <el-table-column width="50">
          <template #default="{ row }">
            <el-checkbox v-model="checked[row.id]" />
          </template>
        </el-table-column>
        <el-table-column label="风险" min-width="240">
          <template #default="{ row }">
            <div style="font-weight: 500">{{ row.label }}</div>
            <div class="reason-text">{{ row.reason }}</div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ row.fields.riskType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="等级" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="severityTag(row.fields.severity)">
              {{ severityLabel(row.fields.severity) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="置信度" width="90">
          <template #default="{ row }">
            <span>{{ (row.confidence * 100).toFixed(0) }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="缓解建议" min-width="220">
          <template #default="{ row }">{{ row.fields.mitigation }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { useAppStore } from '~/stores/app'

const app = useAppStore()

const RULES = [
  { code: 'R1', name: '里程碑延期', tag: '进度', type: 'danger', condition: '里程碑 delayDays > 7 天', action: '进度风险（延期越久等级越高）' },
  { code: 'R2', name: '里程碑逾期未完成', tag: '进度', type: 'danger', condition: '计划完成日期已过且未标记完成', action: '进度风险（高）' },
  { code: 'R3', name: '需求蔓延', tag: '范围', type: 'warning', condition: '需求变更次数 > 3 次', action: '范围风险' },
  { code: 'R4', name: '方案未评审', tag: '技术', type: 'warning', condition: '方案评审状态 = 未评审', action: '技术风险' },
  { code: 'R5', name: '方案存在未决项', tag: '技术', type: 'warning', condition: '方案 hasUnresolvedItems = true', action: '技术风险' },
  { code: 'R6', name: '合同验收条款缺失', tag: '验收', type: 'danger', condition: '合同 hasAcceptanceClause = false', action: '验收风险（高）' },
  { code: 'R7', name: '功能无需求覆盖', tag: '范围', type: 'warning', condition: '功能清单项无任何需求关联（featureId）', action: '范围风险（对齐遗漏）' },
  { code: 'R8', name: '合同关键要素缺失', tag: '合同', type: 'info', condition: '合同缺少金额或关键节点要素', action: '合同风险（实施基线不完整）' }
]

const currentProjectName = computed(
  () => app.projects.find((p) => p.id === app.currentProjectId)?.name || ''
)

const scanning = ref(false)
const suggestions = ref<any[]>([])
const checked = reactive<Record<string, boolean>>({})

const checkedCount = computed(() => suggestions.value.filter((s) => checked[s.id]).length)

const severityTag = (s: string) => ({ high: 'danger', medium: 'warning', low: 'success' })[s] ?? 'info'
const severityLabel = (s: string) => ({ high: '高', medium: '中', low: '低' })[s] ?? s

async function runScan() {
  if (!app.currentProjectId) {
    ElMessage.warning('请先在顶栏选择项目')
    return
  }
  scanning.value = true
  try {
    const res = await $fetch('/api/rules/scan', {
      method: 'POST',
      body: { projectId: app.currentProjectId }
    })
    suggestions.value = res.suggestions || []
    for (const k of Object.keys(checked)) delete checked[k]
    for (const s of suggestions.value) checked[s.id] = true
    ElMessage.success(`扫描完成：命中 ${suggestions.value.length} 条风险建议（已按现有风险去重）`)
  } catch (e: any) {
    ElMessage.error(`扫描失败：${e?.data?.message || e?.message || '未知错误'}`)
  } finally {
    scanning.value = false
  }
}

async function applyChecked() {
  const list = suggestions.value.filter((s) => checked[s.id])
  if (!list.length) {
    ElMessage.warning('请先勾选要采纳的风险')
    return
  }
  let ok = 0
  const failed: string[] = []
  for (const s of list) {
    try {
      await $fetch(`/api/data/${s.entity}`, {
        method: 'POST',
        body: { ...s.fields, projectId: app.currentProjectId }
      })
      ok++
    } catch (e: any) {
      failed.push(`${s.label}：${e?.data?.message || e?.message || '未知错误'}`)
    }
  }
  if (ok > 0) {
    ElMessage.success(`已采纳 ${ok} 条风险，可在「风险中心」查看`)
    suggestions.value = []
    for (const k of Object.keys(checked)) delete checked[k]
  }
  if (failed.length) {
    ElMessage.error(`失败 ${failed.length} 条：${failed.slice(0, 3).join('；')}${failed.length > 3 ? '…' : ''}`)
  }
}

watch(() => app.currentProjectId, () => {
  suggestions.value = []
  for (const k of Object.keys(checked)) delete checked[k]
})
</script>

<style scoped>
.reason-text {
  color: #909399;
  font-size: 12px;
  margin-top: 2px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}
</style>
