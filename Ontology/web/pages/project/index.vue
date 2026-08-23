<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
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

// ===== 项目编辑 / 删除 =====
const editDialog = ref({ open: false, saving: false, form: {} as Record<string, any> })

function openEdit() {
  const p = currentProject.value
  if (!p) return
  editDialog.value = {
    open: true,
    saving: false,
    form: {
      name: p.name || '',
      customer: p.customer || '',
      manager: p.manager || '',
      status: p.status || '售前跟进',
      startDate: p.startDate || '',
      endDate: p.endDate || ''
    }
  }
}

async function submitEdit() {
  const f = editDialog.value.form
  if (!f.name?.trim()) {
    ElMessage.warning('请填写项目名称')
    return
  }
  editDialog.value.saving = true
  try {
    await $fetch(`/api/data/project/${app.currentProjectId}`, {
      method: 'PUT',
      body: {
        name: f.name.trim(),
        customer: f.customer?.trim() || undefined,
        manager: f.manager?.trim() || undefined,
        status: f.status,
        startDate: f.startDate || undefined,
        endDate: f.endDate || undefined
      }
    })
    await app.loadProjects()
    editDialog.value.open = false
    ElMessage.success('项目信息已更新')
  } catch (e: any) {
    ElMessage.error(`更新失败：${e?.data?.message || e?.message || '未知错误'}`)
  } finally {
    editDialog.value.saving = false
  }
}

async function deleteProject() {
  const p = currentProject.value
  if (!p) return
  try {
    await ElMessageBox.confirm(
      `确认删除项目「${p.name}」？其下全部数据（合同/要素/风险/需求/文档/里程碑等）将一并删除，不可恢复！`,
      '删除项目',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
    )
  } catch {
    return // 用户取消
  }
  try {
    await $fetch(`/api/data/project/${p.id}`, { method: 'DELETE' })
    await app.loadProjects()
    if (app.projects.length) {
      app.setCurrentProject(app.projects[0].id)
    } else {
      app.setCurrentProject('')
    }
    ElMessage.success('项目已删除，已切换到其他项目')
  } catch (e: any) {
    ElMessage.error(`删除失败：${e?.data?.message || e?.message || '未知错误'}`)
  }
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
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px">
          <el-descriptions :column="4" border size="small" style="flex: 1">
            <el-descriptions-item label="项目名称">{{ currentProject.name }}</el-descriptions-item>
            <el-descriptions-item label="客户">{{ currentProject.customer || '—' }}</el-descriptions-item>
            <el-descriptions-item label="项目经理">{{ currentProject.manager || '—' }}</el-descriptions-item>
            <el-descriptions-item label="生命周期">
              <el-tag :type="statusType[currentProject.status] || 'info'" size="small">
                {{ currentProject.status || '未设置' }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
          <div style="display: flex; gap: 8px; margin-left: 12px; flex-shrink: 0">
            <el-button size="small" @click="openEdit">✏️ 编辑项目</el-button>
            <el-button size="small" type="danger" plain @click="deleteProject">🗑️ 删除</el-button>
          </div>
        </div>
      </template>
    </div>

    <!-- 编辑项目弹窗 -->
    <el-dialog v-model="editDialog.open" title="编辑项目" width="480px">
      <el-form label-width="90px">
        <el-form-item label="项目名称 *" required>
          <el-input v-model="editDialog.form.name" />
        </el-form-item>
        <el-form-item label="客户">
          <el-input v-model="editDialog.form.customer" />
        </el-form-item>
        <el-form-item label="项目经理">
          <el-input v-model="editDialog.form.manager" />
        </el-form-item>
        <el-form-item label="生命周期">
          <el-select v-model="editDialog.form.status" style="width: 100%">
            <el-option v-for="s in ['售前跟进', '已签约', '实施中', '运维质保', '已关闭']" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker v-model="editDialog.form.startDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="计划结束">
          <el-date-picker v-model="editDialog.form.endDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialog.open = false">取消</el-button>
        <el-button type="primary" :loading="editDialog.saving" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>

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
