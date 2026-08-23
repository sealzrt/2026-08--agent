<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { useAppStore } from '~/stores/app'

const app = useAppStore()
const docs = ref<any[]>([])
const selectedDocId = ref<string>('')
const loading = ref(false)
const running = ref(false)
const suggestions = ref<any[]>([])
const checked = ref<Record<string, boolean>>({})
const resultMeta = ref<{ docType: string; title: string } | null>(null)

const route = useRoute()

const loadDocs = async () => {
  const q = app.currentProjectId ? `?projectId=${app.currentProjectId}` : ''
  docs.value = await $fetch(`/api/data/document${q}`)
  const docId = (route.query.docId as string) || docs.value[0]?.id || ''
  if (docId) {
    selectedDocId.value = docId
  }
}
watch(() => app.currentProjectId, () => loadDocs())
onMounted(loadDocs)

async function runExtract() {
  if (!selectedDocId.value) {
    ElMessage.warning('请先选择文档')
    return
  }
  running.value = true
  suggestions.value = []
  resultMeta.value = null
  try {
    const res: any = await $fetch('/api/ontology/extract', {
      method: 'POST',
      body: { documentId: selectedDocId.value }
    })
    suggestions.value = res.suggestions || []
    resultMeta.value = { docType: res.docType, title: res.title }
    checked.value = {}
    suggestions.value.forEach((s) => (checked.value[s.id] = true))
    if (!suggestions.value.length) {
      ElMessage.info('未识别出建议项，可尝试调整文档类型或检查文档内容')
    }
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '识别失败')
  } finally {
    running.value = false
  }
}

const kindLabel: Record<string, string> = {
  instance: '实例',
  risk: '风险',
  class: '新增类',
  element: '合同要素'
}

const kindTag: Record<string, string> = {
  instance: '',
  risk: 'danger',
  class: 'warning',
  element: 'primary'
}

// ===== 编辑识别结果（手动修改后落库）=====
const KEY_LABELS: Record<string, string> = {
  title: '风险标题',
  riskType: '风险类型',
  severity: '风险等级',
  probability: '发生概率',
  impact: '影响程度',
  mitigation: '缓解措施',
  mitigationStatus: '缓解状态',
  status: '状态',
  source: '识别来源',
  contractNo: '合同编号',
  amount: '合同金额(元)',
  signedDate: '签订日期',
  hasAcceptanceClause: '验收条款明确',
  scopeText: '项目范围',
  paymentMilestones: '付款里程碑',
  reqNo: '需求编号',
  priority: '优先级',
  changeCount: '变更次数',
  isConfirmed: '已确认',
  name: '名称',
  id: 'ID',
  code: '英文标识',
  phase: '阶段',
  description: '说明',
  title2: '标题',
  category: '要素类别',
  content: '要素内容',
  detail: '详细说明',
  confidence: '置信度',
  contractId: '关联合同'
}

const EDIT_OPTIONS: Record<string, string[]> = {
  severity: ['high', 'medium', 'low'],
  status: ['open', 'mitigating', 'confirmed', 'closed', 'rejected'],
  source: ['manual', 'rule', 'relation', 'llm'],
  mitigationStatus: ['未制定', '制定中', '已落实'],
  riskType: ['验收风险', '范围风险', '进度风险', '技术风险', '交付质量风险', 'SLA违约风险', '回款风险'],
  priority: ['高', '中', '低'],
  phase: ['presales', 'implementation', 'ops', 'common'],
  category: ['amount', 'node', 'keyItem', 'feature', 'deliverable', 'warranty', 'metric'],
  elementStatus: ['pending', 'tracking', 'done', 'risk']
}

const editDialog = ref({ open: false, index: -1, fields: {} as Record<string, any> })

function openEdit(s: any, idx: number) {
  editDialog.value = { open: true, index: idx, fields: { ...s.fields } }
}

function saveEdit() {
  const idx = editDialog.value.index
  if (idx >= 0 && suggestions.value[idx]) {
    suggestions.value[idx].fields = { ...editDialog.value.fields }
  }
  editDialog.value.open = false
  ElMessage.success('已更新建议内容，采纳时将按修改后的值写入')
}

// ===== 采纳落库 =====
async function applyOne(s: any) {
  try {
    if (s.kind === 'class') {
      await $fetch('/api/ontology/classes', { method: 'POST', body: s.fields })
    } else {
      await $fetch(`/api/data/${s.entity}`, { method: 'POST', body: s.fields })
    }
    ElMessage.success(`已采纳：${s.label}`)
  } catch (e: any) {
    ElMessage.error(`采纳失败：${e?.data?.message || e?.message || '未知错误'}`)
  }
}

async function applyChecked() {
  const list = suggestions.value.filter((s) => checked.value[s.id])
  if (!list.length) {
    ElMessage.warning('请先勾选要采纳的建议')
    return
  }
  let ok = 0
  const failed: string[] = []
  for (const s of list) {
    try {
      if (s.kind === 'class') {
        await $fetch('/api/ontology/classes', { method: 'POST', body: s.fields })
      } else {
        await $fetch(`/api/data/${s.entity}`, { method: 'POST', body: s.fields })
      }
      ok++
    } catch (e: any) {
      failed.push(`${s.label}：${e?.data?.message || e?.message || '未知错误'}`)
    }
  }
  if (ok > 0) {
    ElMessage.success(`已采纳 ${ok} 条`)
    suggestions.value = []
    resultMeta.value = null
  }
  if (failed.length) {
    ElMessage.error(`失败 ${failed.length} 条：${failed.slice(0, 3).join('；')}${failed.length > 3 ? '…' : ''}`)
  }
  if (ok === 0) {
    ElMessage.error('全部采纳失败，请检查原因')
  }
}
</script>

<template>
  <div>
    <div class="page-card">
      <h2 class="page-title">自动识别 · 文档自动建模</h2>
      <p class="page-desc">
        选择已解析的文档，一键运行 <b>规则抽取引擎</b>（纯规则、零依赖）：
        从合同/需求/范围/功能清单/技术方案中识别 <b>实例、风险、缺失本体概念</b>。
        <b>每条建议都可手动编辑</b>，确认后写入本体库与业务库（可控闭环）。
      </p>

      <div style="display: flex; gap: 12px; align-items: center">
        <el-select v-model="selectedDocId" placeholder="选择文档" style="width: 320px">
          <el-option
            v-for="d in docs"
            :key="d.id"
            :label="`${d.title}（${d.docType}）`"
            :value="d.id"
          />
        </el-select>
        <el-button type="primary" :loading="running" @click="runExtract">
          {{ running ? '识别中…' : '运行自动建模' }}
        </el-button>
        <el-button v-if="suggestions.length" type="success" @click="applyChecked">
          采纳勾选的 {{ Object.values(checked).filter(Boolean).length }} 条
        </el-button>
      </div>

      <el-alert
        v-if="resultMeta"
        type="info"
        :closable="false"
        show-icon
        style="margin-top: 12px"
        :title="`识别完成：${resultMeta.title}（${resultMeta.docType}）· 共 ${suggestions.length} 条建议`"
      />
    </div>

    <div class="page-card" v-if="suggestions.length">
      <el-table :data="suggestions" border size="small">
        <el-table-column label="采纳" width="60">
          <template #default="{ row }">
            <el-checkbox v-model="checked[row.id]" />
          </template>
        </el-table-column>
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="kindTag[row.kind] || 'info'">{{ kindLabel[row.kind] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="label" label="建议内容" min-width="200" />
        <el-table-column prop="reason" label="识别依据" min-width="220" />
        <el-table-column label="置信度" width="90">
          <template #default="{ row }">
            <el-progress
              :percentage="Math.round(row.confidence * 100)"
              :stroke-width="8"
              :show-text="false"
            />
            <span style="font-size: 12px; color: #909399">{{ row.confidence.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row, $index }">
            <el-button size="small" link type="primary" @click="openEdit(row, $index)">编辑</el-button>
            <el-button size="small" link type="success" @click="applyOne(row)">采纳</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="page-card" v-else-if="!running">
      <el-empty description="选择文档后点击「运行自动建模」查看建议" :image-size="80" />
    </div>

    <!-- 编辑识别结果 -->
    <el-dialog v-model="editDialog.open" title="编辑识别结果" width="580px">
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 12px"
        title="手动修改字段后点「保存修改」，采纳时将按编辑后的内容写入库"
      />
      <el-form :model="editDialog.fields" label-width="120px">
        <el-form-item v-for="(val, key) in editDialog.fields" :key="key" :label="KEY_LABELS[key] || key">
          <el-switch v-if="typeof val === 'boolean'" v-model="editDialog.fields[key]" />
          <el-input-number
            v-else-if="typeof val === 'number'"
            v-model="editDialog.fields[key]"
            :step="key === 'probability' || key === 'impact' ? 0.1 : 1"
            :min="key === 'probability' || key === 'impact' ? 0 : undefined"
            :max="key === 'probability' || key === 'impact' ? 1 : undefined"
            style="width: 100%"
          />
          <el-select v-else-if="EDIT_OPTIONS[key]" v-model="editDialog.fields[key]" style="width: 100%">
            <el-option v-for="o in EDIT_OPTIONS[key]" :key="o" :label="o" :value="o" />
          </el-select>
          <el-input
            v-else
            v-model="editDialog.fields[key]"
            :type="typeof val === 'string' && val.length > 40 ? 'textarea' : 'text'"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialog.open = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>
