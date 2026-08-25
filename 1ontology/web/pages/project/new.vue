<template>
  <div class="page-card">
    <h2 class="page-title">🚀 新建项目向导</h2>
    <p class="page-desc">
      按步骤完成一个新项目的搭建：创建项目 → 上传合同（自动解析+建模）→ 确认关键要素 → 确认功能清单 → 完成。
    </p>

    <el-steps :active="step" align-center finish-status="success" style="margin: 24px 0 8px">
      <el-step title="创建项目" />
      <el-step title="上传合同" />
      <el-step title="确认要素" />
      <el-step title="确认功能" />
      <el-step title="完成" />
    </el-steps>

    <!-- ===== Step 1: 创建项目 ===== -->
    <div v-if="step === 0" class="step-panel">
      <el-form label-width="100px" style="max-width: 560px">
        <el-form-item label="项目名称 *" required>
          <el-input v-model="projectForm.name" placeholder="如：某银行数据平台实施项目" />
        </el-form-item>
        <el-form-item label="客户">
          <el-input v-model="projectForm.customer" placeholder="客户名称" />
        </el-form-item>
        <el-form-item label="项目经理">
          <el-input v-model="projectForm.manager" placeholder="负责人" />
        </el-form-item>
        <el-form-item label="生命周期">
          <el-select v-model="projectForm.status" style="width: 100%">
            <el-option v-for="s in ['售前跟进', '已签约', '实施中', '运维质保', '已关闭']" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker v-model="projectForm.startDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </el-form>
    </div>

    <!-- ===== Step 2: 上传合同 ===== -->
    <div v-if="step === 1" class="step-panel">
      <div style="display: flex; gap: 12px; margin-bottom: 12px">
        <el-select v-model="uploadDocType" style="width: 150px">
          <el-option v-for="t in docTypes" :key="t" :label="t" :value="t" />
        </el-select>
        <el-input v-model="uploadTitle" placeholder="合同标题（可选）" style="width: 240px" />
        <el-button @click="openPaste">📋 粘贴文本（扫描件用）</el-button>
      </div>
      <el-upload
        drag
        :auto-upload="true"
        :show-file-list="false"
        accept=".docx,.pdf,.txt,.md"
        :disabled="uploading"
        :http-request="doUpload"
        style="max-width: 720px"
      >
        <div class="el-upload__text">
          <template v-if="!uploading">拖拽 合同文件 到此处，或 <em>点击选择文件</em>（自动解析 + 建模落库）</template>
          <template v-else>上传解析与自动建模中…</template>
        </div>
      </el-upload>

      <!-- 上传完成结果 -->
      <div v-if="uploadResult" class="result-card" style="margin-top: 16px">
        <el-alert type="success" :closable="false" show-icon>
          <template #title>✅ 合同已解析并自动建模：{{ uploadResult.title }}</template>
          <div style="margin-top: 6px; display: flex; gap: 8px; flex-wrap: wrap">
            <el-tag type="primary">关键要素 {{ uploadResult.adopted.elements }} 条</el-tag>
            <el-tag type="success">功能清单 {{ uploadResult.adopted.features }} 个</el-tag>
            <el-tag v-if="uploadResult.adopted.instances" type="info">合同实例 {{ uploadResult.adopted.instances }} 条</el-tag>
            <el-tag type="warning">风险建议 {{ uploadResult.riskSuggestions.length }} 条</el-tag>
          </div>
        </el-alert>

        <template v-if="uploadResult.riskSuggestions.length">
          <h4 style="margin: 12px 0 8px">⚠️ 风险建议（勾选后采纳到风险中心）</h4>
          <el-table :data="uploadResult.riskSuggestions" border size="small" max-height="200">
            <el-table-column width="50">
              <template #default="{ row }"><el-checkbox v-model="riskChecked[row.id]" /></template>
            </el-table-column>
            <el-table-column label="风险" min-width="200">
              <template #default="{ row }">
                <div style="font-weight: 500">{{ row.label }}</div>
                <div style="color: #909399; font-size: 12px">{{ row.reason }}</div>
              </template>
            </el-table-column>
            <el-table-column label="等级" width="80">
              <template #default="{ row }">
                <el-tag size="small" :type="severityTag(row.fields.severity)">{{ severityLabel(row.fields.severity) }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-button type="danger" size="small" style="margin-top: 8px" @click="adoptRisks">采纳勾选的 {{ riskCheckedCount }} 条风险</el-button>
        </template>
        <el-alert v-else type="info" :closable="false" show-icon title="未识别到明显风险信号" style="margin-top: 8px" />
      </div>
    </div>

    <!-- ===== Step 3: 确认关键要素 ===== -->
    <div v-if="step === 2" class="step-panel">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
        <div>
          <b>合同关键要素（{{ elements.length }} 条）</b>
          <span style="color: #909399; font-size: 13px; margin-left: 8px">自动抽取，可删除误识别项；后续实施按此判断延期/遗漏/偏移</span>
        </div>
        <el-button size="small" @click="loadElements">🔄 刷新</el-button>
      </div>
      <el-empty v-if="!elements.length" description="暂无要素（上传的合同中未识别出关键要素）" :image-size="60" />
      <div v-else style="display: flex; flex-wrap: wrap; gap: 10px">
        <el-card v-for="e in elements" :key="e.id" class="elem-card" shadow="never">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px">
            <el-tag size="small" :type="categoryTag(e.category)">{{ categoryLabel[e.category] || e.category }}</el-tag>
            <el-button size="small" link type="danger" @click="removeElement(e)">删除</el-button>
          </div>
          <div style="font-size: 13px; margin-top: 6px; line-height: 1.6">{{ e.content }}</div>
          <div v-if="e.detail" style="color: #909399; font-size: 12px; margin-top: 4px">{{ e.detail }}</div>
        </el-card>
      </div>
    </div>

    <!-- ===== Step 4: 确认功能清单 ===== -->
    <div v-if="step === 3" class="step-panel">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
        <div>
          <b>功能清单（{{ features.length }} 个）</b>
          <span style="color: #909399; font-size: 13px; margin-left: 8px">后续需求/方案/计划将按功能对齐</span>
        </div>
        <el-button size="small" @click="loadFeatures">🔄 刷新</el-button>
      </div>
      <el-empty v-if="!features.length" description="暂无功能（上传的合同中未识别出功能模块）" :image-size="60" />
      <el-table v-else :data="features" border size="small">
        <el-table-column prop="code" label="编号" width="80" />
        <el-table-column prop="name" label="功能名称" min-width="160" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="优先级" width="90">
          <template #default="{ row }">
            <el-select v-model="row.priority" size="small" @change="(v: any) => updateFeature(row, { priority: v })">
              <el-option v-for="p in ['P0', 'P1', 'P2']" :key="p" :label="p" :value="p" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-select v-model="row.status" size="small" @change="(v: any) => updateFeature(row, { status: v })">
              <el-option v-for="s in ['未开始', '进行中', '已完成', '已验收']" :key="s" :label="s" :value="s" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button size="small" link type="danger" @click="removeFeature(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- ===== Step 5: 完成 ===== -->
    <div v-if="step === 4" class="step-panel">
      <el-result icon="success" title="项目搭建完成" :sub-title="`项目「${projectName}」已就绪：合同、关键要素、功能清单均已落库`">
        <template #extra>
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap">
            <el-tag type="primary">关键要素 {{ elements.length }} 条</el-tag>
            <el-tag type="success">功能清单 {{ features.length }} 个</el-tag>
            <el-tag type="info">合同 {{ contracts.length }} 份</el-tag>
            <el-tag type="warning">风险 {{ risks.length }} 条</el-tag>
          </div>
          <div style="margin-top: 16px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap">
            <el-button type="primary" @click="$router.push('/project')">📁 查看项目总览</el-button>
            <el-button @click="$router.push('/features')">🧩 查看功能清单</el-button>
            <el-button @click="$router.push('/contract')">📄 查看合同与要素</el-button>
            <el-button @click="$router.push('/risk')">⚠️ 风险中心</el-button>
          </div>
        </template>
      </el-result>
    </div>

    <!-- 导航 -->
    <div style="display: flex; justify-content: space-between; margin-top: 24px">
      <el-button :disabled="step === 0" @click="step--">上一步</el-button>
      <div>
        <el-button v-if="step === 0" type="primary" :loading="creating" @click="createProject">创建项目 →</el-button>
        <el-button v-else-if="step === 1" type="primary" :disabled="!uploadResult" @click="step++">下一步：确认要素 →</el-button>
        <el-button v-else-if="step < 4" type="primary" @click="step++">下一步 →</el-button>
        <el-button v-else type="success" @click="$router.push('/project')">完成</el-button>
      </div>
    </div>

    <!-- 粘贴文本 -->
    <el-dialog v-model="pasteDialog.open" title="粘贴合同文本（保存后自动建模）" width="680px">
      <el-input v-model="pasteForm.content" type="textarea" :rows="12" placeholder="从扫描件 PDF / Word 复制文字粘贴（macOS 预览打开后 Cmd+A → Cmd+C）" />
      <template #footer>
        <el-button @click="pasteDialog.open = false">取消</el-button>
        <el-button type="primary" :loading="pasting" @click="submitPaste">保存并自动建模</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { useAppStore } from '~/stores/app'

const app = useAppStore()
const router = useRouter()

const docTypes = ['合同内容', '项目范围', '功能清单', '产品原型', '技术方案']
const step = ref(0)

// ===== Step 1: 创建项目 =====
const projectForm = ref({ name: '', customer: '', manager: '', status: '售前跟进', startDate: '' })
const creating = ref(false)

async function createProject() {
  if (!projectForm.value.name.trim()) {
    ElMessage.warning('请填写项目名称')
    return
  }
  creating.value = true
  try {
    await app.createProject({
      name: projectForm.value.name.trim(),
      customer: projectForm.value.customer.trim() || undefined,
      manager: projectForm.value.manager.trim() || undefined,
      status: projectForm.value.status,
      startDate: projectForm.value.startDate || undefined
    })
    ElMessage.success(`项目「${projectForm.value.name.trim()}」已创建并设为当前项目`)
    // 清空表单，避免下一次创建残留上次输入
    projectForm.value = { name: '', customer: '', manager: '', status: '售前跟进', startDate: '' }
    step.value = 1
  } catch (e: any) {
    ElMessage.error(`创建失败：${e?.data?.message || e?.message || '未知错误'}`)
  } finally {
    creating.value = false
  }
}

const projectName = computed(() => app.projects.find((p) => p.id === app.currentProjectId)?.name || '')

// ===== Step 2: 上传/粘贴合同（自动解析+建模落库）=====
const uploadDocType = ref('合同内容')
const uploadTitle = ref('')
const uploading = ref(false)
const uploadResult = ref<null | any>(null)
const riskChecked = reactive<Record<string, boolean>>({})

async function doUpload(options: any) {
  if (!app.currentProjectId) {
    ElMessage.warning('请先完成第 1 步创建项目')
    return
  }
  const fd = new FormData()
  fd.append('file', options.file)
  fd.append('docType', uploadDocType.value)
  if (uploadTitle.value) fd.append('title', uploadTitle.value)
  fd.append('projectId', app.currentProjectId)
  uploading.value = true
  try {
    const res: any = await $fetch('/api/documents/upload', { method: 'POST', body: fd })
    uploadResult.value = res
    for (const s of res.riskSuggestions || []) riskChecked[s.id] = true
    ElMessage.success(`✅ 自动建模完成：${res.adopted.elements} 条要素、${res.adopted.features} 个功能已落库`)
    loadElements()
    loadFeatures()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '上传/解析失败')
  } finally {
    uploading.value = false
  }
}

const pasteDialog = ref({ open: false })
const pasteForm = ref({ content: '' })
const pasting = ref(false)

function openPaste() {
  pasteForm.value.content = ''
  pasteDialog.value.open = true
}

async function submitPaste() {
  if (!pasteForm.value.content.trim()) {
    ElMessage.warning('请粘贴合同文本')
    return
  }
  if (!app.currentProjectId) {
    ElMessage.warning('请先完成第 1 步创建项目')
    return
  }
  pasting.value = true
  try {
    const doc: any = await $fetch('/api/data/document', {
      method: 'POST',
      body: { projectId: app.currentProjectId, docType: uploadDocType.value, title: uploadTitle.value || '粘贴合同', content: pasteForm.value.content, reviewed: false }
    })
    const res: any = await $fetch(`/api/documents/${doc.id}/auto-model`, {
      method: 'POST',
      body: { projectId: app.currentProjectId }
    })
    uploadResult.value = res
    for (const s of res.riskSuggestions || []) riskChecked[s.id] = true
    ElMessage.success(`✅ 自动建模完成：${res.adopted.elements} 条要素、${res.adopted.features} 个功能已落库`)
    pasteDialog.value.open = false
    loadElements()
    loadFeatures()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '保存/建模失败')
  } finally {
    pasting.value = false
  }
}

// 风险采纳
const riskCheckedCount = computed(() => Object.values(riskChecked).filter(Boolean).length)
async function adoptRisks() {
  const list = (uploadResult.value?.riskSuggestions || []).filter((s: any) => riskChecked[s.id])
  if (!list.length) {
    ElMessage.warning('请先勾选风险')
    return
  }
  let ok = 0
  for (const s of list) {
    try {
      await $fetch('/api/data/risk', { method: 'POST', body: { ...s.fields, projectId: app.currentProjectId } })
      ok++
    } catch { /* 忽略单条 */ }
  }
  ElMessage.success(`已采纳 ${ok} 条风险到风险中心`)
  loadRisks()
}

// ===== Step 3/4: 要素与功能（从 API 加载当前项目数据）=====
const elements = ref<any[]>([])
const features = ref<any[]>([])
const contracts = ref<any[]>([])
const risks = ref<any[]>([])

const categoryLabel: Record<string, string> = {
  amount: '合同金额', node: '关键节点', milestone: '里程碑', keyItem: '关键事项',
  feature: '功能清单', deliverable: '交付物', warranty: '维保', sla: 'SLA 响应时效', metric: '关键指标'
}
const categoryTag = (c: string) =>
  ({ amount: 'danger', node: 'warning', keyItem: 'primary', deliverable: 'success', warranty: 'info', metric: 'warning' })[c] ?? ''

const loadElements = async () => {
  if (!app.currentProjectId) return
  elements.value = await $fetch(`/api/data/contractElement?projectId=${app.currentProjectId}`)
}
const loadFeatures = async () => {
  if (!app.currentProjectId) return
  features.value = await $fetch(`/api/data/feature?projectId=${app.currentProjectId}`)
}
const loadContracts = async () => {
  if (!app.currentProjectId) return
  contracts.value = await $fetch(`/api/data/contract?projectId=${app.currentProjectId}`)
}
const loadRisks = async () => {
  if (!app.currentProjectId) return
  risks.value = await $fetch(`/api/data/risk?projectId=${app.currentProjectId}`)
}

async function removeElement(e: any) {
  await $fetch(`/api/data/contractElement/${e.id}`, { method: 'DELETE' })
  loadElements()
}
async function removeFeature(f: any) {
  await $fetch(`/api/data/feature/${f.id}`, { method: 'DELETE' })
  loadFeatures()
}
async function updateFeature(f: any, patch: Record<string, unknown>) {
  await $fetch(`/api/data/feature/${f.id}`, { method: 'PUT', body: patch })
}

const severityTag = (s: string) => ({ high: 'danger', medium: 'warning', low: 'success' })[s] ?? 'info'
const severityLabel = (s: string) => ({ high: '高', medium: '中', low: '低' })[s] ?? s

// 进入完成步时加载统计
watch(step, (v) => {
  if (v === 4) {
    loadContracts()
    loadRisks()
  }
})

onMounted(async () => {
  await app.loadProjects()
  // 如果已有当前项目，允许从 Step 1 直接进 Step 2
  if (app.currentProjectId) {
    projectForm.value.name = app.projects.find((p) => p.id === app.currentProjectId)?.name || ''
  }
})
</script>

<style scoped>
.step-panel {
  min-height: 260px;
  padding: 16px 8px;
}
.result-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  background: #fafbfc;
}
.elem-card {
  width: 300px;
  border-radius: 6px;
}
.elem-card :deep(.el-card__body) {
  padding: 10px 12px;
}
</style>
