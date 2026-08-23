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

const docTypes = ['合同内容', '项目范围', '功能清单', '产品原型', '技术方案', '会议纪要']

const loadDocs = async () => {
  loading.value = true
  try {
    docs.value = await $fetch('/api/data/document')
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}
onMounted(loadDocs)

async function doUpload(options: any) {
  const fd = new FormData()
  fd.append('file', options.file)
  fd.append('docType', docType.value)
  if (title.value) fd.append('title', title.value)
  if (app.currentProjectId) fd.append('projectId', app.currentProjectId)
  uploading.value = true
  try {
    const res: any = await $fetch('/api/documents/upload', { method: 'POST', body: fd })
    ElMessage.success(`解析成功：${res.title}（${res.content?.length || 0} 字符）`)
    docType.value = '合同内容'
    title.value = ''
    loadDocs()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '上传/解析失败')
  } finally {
    uploading.value = false
  }
}

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
  pasting.value = true
  try {
    const res: any = await $fetch('/api/data/document', {
      method: 'POST',
      body: {
        docType: pasteForm.value.docType,
        title: pasteForm.value.title,
        content: pasteForm.value.content,
        reviewed: false,
        projectId: app.currentProjectId || undefined
      }
    })
    ElMessage.success(`已保存文档：${res.title}（${res.content?.length || 0} 字符）`)
    pasteDialog.value.open = false
    loadDocs()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '保存失败')
  } finally {
    pasting.value = false
  }
}

function goDetect(doc: any) {
  navigateTo(`/auto-detect?docId=${doc.id}`)
}
</script>

<template>
  <div>
    <div class="page-card">
      <h2 class="page-title">文档中心</h2>
      <p class="page-desc">
        两种录入方式：① 上传 <b>.docx / .pdf / .txt</b> 自动解析；② <b>粘贴文本</b>（扫描件合同可用
        macOS「预览」打开后全选复制文字，粘贴即可）。解析后的文档可到「自动识别」页面自动建模。
      </p>

      <el-form inline style="margin-bottom: 4px">
        <el-form-item label="文档类型">
          <el-select v-model="docType" style="width: 140px">
            <el-option v-for="t in docTypes" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="自定义标题">
          <el-input v-model="title" placeholder="留空则用文件名" style="width: 200px" />
        </el-form-item>
        <el-form-item>
          <el-button @click="openPaste">📋 粘贴文本录入</el-button>
        </el-form-item>
      </el-form>

      <el-upload
        drag
        :auto-upload="true"
        :http-request="doUpload"
        :show-file-list="false"
        accept=".docx,.pdf,.txt,.md"
        :disabled="uploading"
      >
        <div style="padding: 24px 0">
          <div style="font-size: 32px; margin-bottom: 8px">📄</div>
          <div style="color: #409eff; font-weight: 500">点击或拖拽文件到此处上传</div>
          <div style="color: #909399; font-size: 12px; margin-top: 6px">
            支持 Word(.docx) / PDF / TXT · 扫描件请用「粘贴文本录入」
          </div>
        </div>
      </el-upload>
    </div>

    <div class="page-card">
      <el-table :data="docs" border size="small" v-loading="loading">
        <el-table-column prop="title" label="文档标题" min-width="200" />
        <el-table-column prop="docType" label="类型" width="110" />
        <el-table-column label="内容长度" width="100">
          <template #default="{ row }">{{ row.content?.length || 0 }} 字</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link @click="preview = { open: true, doc: row }">预览</el-button>
            <el-button size="small" link type="primary" @click="goDetect(row)">自动建模</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无文档，请上传或粘贴文本" :image-size="60" />
        </template>
      </el-table>
    </div>

    <!-- 粘贴文本录入 -->
    <el-dialog v-model="pasteDialog.open" title="粘贴文本录入" width="720px">
      <el-form :model="pasteForm" label-width="100px">
        <el-form-item label="文档类型">
          <el-select v-model="pasteForm.docType" style="width: 100%">
            <el-option v-for="t in docTypes" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="文档标题 *" required>
          <el-input v-model="pasteForm.title" placeholder="如：2024年阳光新能源市场商机管理开发服务合同" />
        </el-form-item>
        <el-form-item label="文档内容 *" required>
          <el-input
            v-model="pasteForm.content"
            type="textarea"
            :rows="14"
            placeholder="从 PDF/Word 中复制文字粘贴到这里（扫描件可用 macOS 预览打开后选中复制）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pasteDialog.open = false">取消</el-button>
        <el-button type="primary" :loading="pasting" @click="submitPaste">保存并可用于自动建模</el-button>
      </template>
    </el-dialog>

    <!-- 预览 -->
    <el-dialog v-model="preview.open" :title="preview.doc?.title" width="720px">
      <div class="preview-box">
        <pre>{{ preview.doc?.content }}</pre>
      </div>
      <template #footer>
        <el-button @click="preview.open = false">关闭</el-button>
        <el-button type="primary" @click="goDetect(preview.doc)">去自动建模 →</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.preview-box {
  max-height: 480px;
  overflow: auto;
  background: #f9fafc;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
}

.preview-box pre {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.7;
}
</style>
