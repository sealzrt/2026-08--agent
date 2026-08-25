<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { useAppStore } from '~/stores/app'

const app = useAppStore()

const docs = ref<any[]>([])
const loading = ref(false)
const docType = ref('合同内容')
const title = ref('')
const preview = ref({ open: false, doc: null as any })
const uploading = ref(false)

// 粘贴文本录入
const pasteDialog = ref({ open: false })
const pasteForm = ref({ docType: '合同内容', title: '', content: '' })
const pasting = ref(false)

// 自动建模结果（上传/粘贴后展示）
const autoResult = ref<null | {
  title: string
  adopted: { elements: number; features: number; instances: number }
  riskSuggestions: any[]
  classSuggestions: any[]
}>(null)
const adopting = ref(false)

const docTypes = ['合同内容', '项目范围', '功能清单', '产品原型', '技术方案', '会议纪要']

const loadDocs = async () => {
  loading.value = true
  try {
    const q = app.currentProjectId ? `?projectId=${app.currentProjectId}` : ''
    docs.value = await $fetch(`/api/data/document${q}`)
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

watch(() => app.currentProjectId, () => {
  loadDocs()
  autoResult.value = null
})
onMounted(loadDocs)

// ===== 上传：自动解析 + 自动建模落库 =====
async function doUpload(options: any) {
  if (!app.currentProjectId) {
    ElMessage.warning('请先在顶栏选择归属项目（上传的数据按项目维度管理）')
    return
  }
  const fd = new FormData()
  fd.append('file', options.file)
  fd.append('docType', docType.value)
  if (title.value) fd.append('title', title.value)
  fd.append('projectId', app.currentProjectId)
  uploading.value = true
  try {
    const res: any = await $fetch('/api/documents/upload', { method: 'POST', body: fd })
    autoResult.value = res
    ElMessage.success(`✅ 自动建模完成：已写入 ${res.adopted.elements} 条要素、${res.adopted.features} 个功能${res.adopted.instances ? `、${res.adopted.instances} 条实例` : ''}`)
    docType.value = '合同内容'
    title.value = ''
    loadDocs()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '上传/解析失败')
  } finally {
    uploading.value = false
  }
}

// ===== 粘贴文本：保存后也自动建模落库 =====
function openPaste() {
  pasteForm.value = { docType: '合同内容', title: '', content: '' }
  pasteDialog.value.open = true
}

async function submitPaste() {
  if (!pasteForm.value.content.trim()) {
    ElMessage.warning('请粘贴文档内容')
    return
  }
  if (!pasteForm.value.title.trim()) {
    ElMessage.warning('请填写文档标题')
    return
  }
  if (!app.currentProjectId) {
    ElMessage.warning('请先在顶栏选择归属项目')
    return
  }
  pasting.value = true
  try {
    const doc: any = await $fetch('/api/data/document', {
      method: 'POST',
      body: {
        docType: pasteForm.value.docType,
        title: pasteForm.value.title,
        content: pasteForm.value.content,
        reviewed: false,
        projectId: app.currentProjectId
      }
    })
    // 保存后自动建模落库
    const res: any = await $fetch(`/api/documents/${doc.id}/auto-model`, {
      method: 'POST',
      body: { projectId: app.currentProjectId }
    })
    autoResult.value = res
    ElMessage.success(`✅ 自动建模完成：已写入 ${res.adopted.elements} 条要素、${res.adopted.features} 个功能${res.adopted.instances ? `、${res.adopted.instances} 条实例` : ''}`)
    pasteDialog.value.open = false
    loadDocs()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '保存/建模失败')
  } finally {
    pasting.value = false
  }
}

// ===== 一键采纳风险建议 =====
async function adoptRisks() {
  if (!autoResult.value?.riskSuggestions?.length) return
  adopting.value = true
  let ok = 0
  const failed: string[] = []
  for (const s of autoResult.value.riskSuggestions) {
    try {
      await $fetch('/api/data/risk', {
        method: 'POST',
        body: { ...s.fields, projectId: app.currentProjectId }
      })
      ok++
    } catch (e: any) {
      failed.push(`${s.label}：${e?.data?.message || e?.message || '未知错误'}`)
    }
  }
  if (ok > 0) ElMessage.success(`已采纳 ${ok} 条风险到风险中心`)
  if (failed.length) ElMessage.error(`失败 ${failed.length} 条：${failed.slice(0, 3).join('；')}`)
  autoResult.value.riskSuggestions = []
  adopting.value = false
}

const severityTag = (s: string) => ({ high: 'danger', medium: 'warning', low: 'success' })[s] ?? 'info'
const severityLabel = (s: string) => ({ high: '高', medium: '中', low: '低' })[s] ?? s
</script>

<template>
  <div class="page-card">
    <h2 class="page-title">文档中心</h2>
    <p class="page-desc">
      上传或粘贴合同/需求等文档，系统<b>自动解析并完成建模</b>：
      关键要素与功能清单自动落库，风险建议一键采纳。文档类型：{{ docTypes.join(' / ') }}
    </p>

    <el-alert :type="app.currentProjectId ? 'success' : 'warning'" :closable="false" show-icon style="margin-bottom: 12px">
      <template #title>
        当前项目：<b>{{ app.projects.find((p) => p.id === app.currentProjectId)?.name || '未选择' }}</b>
        —— 上传/粘贴的文档及自动建模数据将归属该项目。
        <template v-if="!app.currentProjectId">请先在顶栏选择项目（或点「＋ 新建项目」）。</template>
      </template>
    </el-alert>

    <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px">
      <el-select v-model="docType" style="width: 150px">
        <el-option v-for="t in docTypes" :key="t" :label="t" :value="t" />
      </el-select>
      <el-input v-model="title" placeholder="自定义标题（可选）" style="width: 240px" />
      <el-button @click="openPaste">📋 粘贴文本录入</el-button>
      <el-upload
        drag
        :auto-upload="true"
        :show-file-list="false"
        accept=".docx,.pdf,.txt,.md"
        :disabled="uploading"
        :http-request="doUpload"
        style="flex: 1; min-width: 320px"
      >
        <div class="el-upload__text">
          <template v-if="!uploading">拖拽 合同/需求 文档到此处，或 <em>点击选择文件</em>（自动解析+建模）</template>
          <template v-else>上传解析与自动建模中…</template>
        </div>
      </el-upload>
    </div>

    <!-- 自动建模完成结果 -->
    <div v-if="autoResult" class="auto-result">
      <el-alert type="success" :closable="false" show-icon style="margin-bottom: 12px">
        <template #title>
          ✅ 自动建模完成：{{ autoResult.title }}
        </template>
        <div style="margin-top: 6px; display: flex; gap: 8px; flex-wrap: wrap">
          <el-tag type="primary">合同要素 {{ autoResult.adopted.elements }} 条</el-tag>
          <el-tag type="success">功能清单 {{ autoResult.adopted.features }} 个</el-tag>
          <el-tag v-if="autoResult.adopted.instances" type="info">合同实例 {{ autoResult.adopted.instances }} 条</el-tag>
          <el-tag type="warning">风险建议 {{ autoResult.riskSuggestions.length }} 条</el-tag>
        </div>
        <div style="margin-top: 8px; font-size: 13px; color: #606266">
          要素/功能/实例已直接写入项目库 → 查看：<b>/contract「合同关键要素」</b> · <b>/features「功能清单」</b>
        </div>
      </el-alert>

      <template v-if="autoResult.riskSuggestions.length">
        <h3 style="margin: 12px 0 8px">⚠️ 识别到的风险建议（可逐条编辑后采纳，或一键全部采纳）</h3>
        <el-table :data="autoResult.riskSuggestions" border size="small" max-height="260">
          <el-table-column label="风险" min-width="220">
            <template #default="{ row }">
              <div style="font-weight: 500">{{ row.label }}</div>
              <div style="color: #909399; font-size: 12px">{{ row.reason }}</div>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="100">
            <template #default="{ row }"><el-tag size="small">{{ row.fields.riskType }}</el-tag></template>
          </el-table-column>
          <el-table-column label="等级" width="80">
            <template #default="{ row }">
              <el-tag size="small" :type="severityTag(row.fields.severity)">{{ severityLabel(row.fields.severity) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="置信度" width="90">
            <template #default="{ row }">{{ (row.confidence * 100).toFixed(0) }}%</template>
          </el-table-column>
        </el-table>
        <el-button type="danger" :loading="adopting" style="margin-top: 10px" @click="adoptRisks">
          ✅ 一键采纳 {{ autoResult.riskSuggestions.length }} 条风险到风险中心
        </el-button>
      </template>
      <el-alert v-else type="info" :closable="false" show-icon title="未识别到明显风险信号（文档内容较规范）" style="margin-top: 8px" />
    </div>

    <!-- 文档列表 -->
    <h3 style="margin: 16px 0 8px">已录入文档（{{ docs.length }}）</h3>
    <el-table :data="docs" border size="small" v-loading="loading" empty-text="暂无文档，请上传或粘贴文本">
      <el-table-column prop="title" label="标题" min-width="200" />
      <el-table-column prop="docType" label="类型" width="100" />
      <el-table-column prop="content" label="内容预览" min-width="240" show-overflow-tooltip>
        <template #default="{ row }">{{ (row.content || '').slice(0, 80) }}</template>
      </el-table-column>
      <el-table-column prop="createdAt" label="录入时间" width="160">
        <template #default="{ row }">{{ (row.createdAt || '').slice(0, 19).replace('T', ' ') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button size="small" link @click="preview = { open: true, doc: row }">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 文档预览 -->
    <el-dialog v-model="preview.open" :title="preview.doc?.title" width="720px">
      <pre style="white-space: pre-wrap; font-size: 13px; max-height: 480px; overflow: auto">{{ preview.doc?.content }}</pre>
    </el-dialog>

    <!-- 粘贴文本录入 -->
    <el-dialog v-model="pasteDialog.open" title="粘贴文本录入（保存后自动建模）" width="720px">
      <el-form label-width="90px">
        <el-form-item label="文档类型">
          <el-select v-model="pasteForm.docType" style="width: 100%">
            <el-option v-for="t in docTypes" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" required>
          <el-input v-model="pasteForm.title" placeholder="如：XX项目软件开发合同" />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input
            v-model="pasteForm.content"
            type="textarea"
            :rows="14"
            placeholder="从 PDF/Word 中复制文字粘贴到这里（扫描件可用 macOS 预览打开后选中复制，Cmd+A → Cmd+C）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pasteDialog.open = false">取消</el-button>
        <el-button type="primary" :loading="pasting" @click="submitPaste">保存并自动建模</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.auto-result {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  background: #fafbfc;
  margin-bottom: 8px;
}
</style>
