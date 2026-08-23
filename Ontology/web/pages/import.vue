<template>
  <div class="page-card">
    <h2 class="page-title">数据导入</h2>
    <p class="page-desc">
      从 <b>Excel / CSV</b> 批量导入业务数据（合同、需求、计划、风险、功能清单、干系人等），
      减少手工录入。导入的数据自动归属<b>当前项目</b>。
    </p>

    <el-alert :type="app.currentProjectId ? 'success' : 'warning'" :closable="false" show-icon style="margin-bottom: 12px">
      <template #title>
        当前项目：<b>{{ currentProjectName || '未选择' }}</b> —— 导入的数据将全部归属该项目。
        <template v-if="!app.currentProjectId">请先在顶栏选择项目。</template>
      </template>
    </el-alert>

    <!-- 第一步：选实体 + 上传 -->
    <el-form label-width="90px" style="max-width: 560px">
      <el-form-item label="目标实体" required>
        <el-select v-model="entity" placeholder="选择要导入的实体" style="width: 100%" :disabled="previewed">
          <el-option v-for="(f, key) in IMPORT_ENTITY_OPTIONS" :key="key" :label="f" :value="key" />
        </el-select>
      </el-form-item>
      <el-form-item label="文件" required>
        <el-upload
          drag
          :auto-upload="false"
          :show-file-list="false"
          accept=".xlsx,.xls,.csv"
          :on-change="onFileChange"
          style="width: 100%"
        >
          <div v-if="!fileName" class="el-upload__text">拖拽 Excel/CSV 到此处，或 <em>点击选择文件</em></div>
          <div v-else class="el-upload__text"><b>{{ fileName }}</b>（已选择，点击可重新选择）</div>
        </el-upload>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="previewing" :disabled="!file || !entity" @click="preview">
          📄 解析并预览
        </el-button>
        <el-button v-if="previewed" @click="reset">重新选择</el-button>
      </el-form-item>
    </el-form>

    <!-- 第二步：列映射 + 预览 -->
    <template v-if="previewed">
      <el-divider content-position="left">列映射（自动匹配，可手动调整）</el-divider>
      <el-alert
        v-if="unmappedColumns.length"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 12px"
        :title="`${unmappedColumns.length} 列未映射（将忽略）：${unmappedColumns.join('、')}`"
      />
      <el-table :data="mappingRows" border size="small" style="margin-bottom: 12px">
        <el-table-column label="文件列" width="200">
          <template #default="{ row }"><b>{{ row.column }}</b></template>
        </el-table-column>
        <el-table-column label="映射到字段" min-width="220">
          <template #default="{ row }">
            <el-select v-model="row.field" clearable placeholder="忽略此列" size="small" style="width: 100%">
              <el-option v-for="f in importableFields" :key="f.key" :label="f.label" :value="f.key">
                <span>{{ f.label }}</span>
                <el-tag v-if="f.required" type="danger" size="small" style="margin-left: 6px">必填</el-tag>
              </el-option>
            </el-select>
          </template>
        </el-table-column>
      </el-table>

      <el-divider content-position="left">数据预览（前 {{ previewRows.length }} 行 / 共 {{ totalRows }} 行）</el-divider>
      <el-table :data="previewRows" border size="small" max-height="320" style="margin-bottom: 12px">
        <el-table-column
          v-for="col in columns"
          :key="col"
          :prop="col"
          :label="col"
          min-width="120"
          show-overflow-tooltip
        />
      </el-table>

      <div style="display: flex; gap: 12px; align-items: center">
        <el-button type="success" :loading="importing" @click="doImport">
          ⬆️ 导入 {{ totalRows }} 行到「{{ currentProjectName }}」
        </el-button>
        <el-tag v-if="importResult" :type="importResult.failed ? 'warning' : 'success'">
          成功 {{ importResult.success }} / {{ importResult.total }} 行
        </el-tag>
      </div>
      <el-alert
        v-if="importResult?.errors?.length"
        type="error"
        :closable="false"
        show-icon
        style="margin-top: 12px"
        :title="importResult.errors.join('；')"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { useAppStore } from '~/stores/app'

const app = useAppStore()

const IMPORT_ENTITY_OPTIONS: Record<string, string> = {
  bid: '售前商机', contract: '合同', milestone: '里程碑', task: '任务',
  requirement: '需求', solution: '方案', risk: '风险', feature: '功能清单',
  stakeholder: '干系人', opsEvent: '运维事件', warranty: '维保', document: '文档'
}

const currentProjectName = computed(
  () => app.projects.find((p) => p.id === app.currentProjectId)?.name || ''
)

// ===== 第一步：选实体 + 文件 =====
const entity = ref('')
const file = ref<File | null>(null)
const fileName = ref('')
const previewing = ref(false)

function onFileChange(uploadFile: any) {
  file.value = uploadFile.raw
  fileName.value = uploadFile.name
}

// ===== 第二步：预览与映射 =====
const previewed = ref(false)
const columns = ref<string[]>([])
const totalRows = ref(0)
const previewRows = ref<any[]>([])
const importableFields = ref<any[]>([])
const mappingRows = ref<{ column: string; field: string }[]>([])

const unmappedColumns = computed(() => mappingRows.value.filter((r) => !r.field).map((r) => r.column))

async function preview() {
  if (!file.value) {
    ElMessage.warning('请选择文件')
    return
  }
  if (!entity.value) {
    ElMessage.warning('请选择目标实体')
    return
  }
  previewing.value = true
  try {
    const fd = new FormData()
    fd.append('file', file.value)
    fd.append('entity', entity.value)
    const res = await $fetch('/api/import/preview', { method: 'POST', body: fd })
    columns.value = res.columns || []
    totalRows.value = res.totalRows || 0
    previewRows.value = res.rows || []
    importableFields.value = res.importableFields || []
    // 自动映射：列名包含字段 label 或 key 则自动匹配
    mappingRows.value = columns.value.map((col) => {
      const f = importableFields.value.find(
        (x: any) => col.includes(x.label) || col.includes(x.key) || x.label.includes(col) || x.key.includes(col)
      )
      return { column: col, field: f ? f.key : '' }
    })
    previewed.value = true
  } catch (e: any) {
    ElMessage.error(`解析失败：${e?.data?.message || e?.message || '未知错误'}`)
  } finally {
    previewing.value = false
  }
}

// ===== 第三步：导入 =====
const importing = ref(false)
const importResult = ref<{ total: number; success: number; failed: number; errors?: string[] } | null>(null)

async function doImport() {
  if (!app.currentProjectId) {
    ElMessage.warning('请先在顶栏选择归属项目')
    return
  }
  const mapped = mappingRows.value.filter((r) => r.field)
  if (!mapped.length) {
    ElMessage.warning('请至少映射一列')
    return
  }
  const required = importableFields.value.filter((f: any) => f.required).map((f: any) => f.key)
  const rows = previewRows.value.map((raw) => {
    const rec: Record<string, unknown> = {}
    for (const m of mapped) {
      const v = raw[m.column]
      if (v !== '' && v !== undefined && v !== null) rec[m.field] = v
    }
    return rec
  })
  const missingReq = rows.filter((r) => required.some((k) => r[k] === undefined || r[k] === ''))
  if (missingReq.length) {
    ElMessage.warning(`有 ${missingReq.length} 行缺少必填字段（如：${required.join('、')}），请检查后重试`)
    return
  }
  importing.value = true
  try {
    const res = await $fetch('/api/import/apply', {
      method: 'POST',
      body: { entity: entity.value, projectId: app.currentProjectId, rows }
    })
    importResult.value = res
    if (res.failed) {
      ElMessage.warning(`导入完成：成功 ${res.success} / ${res.total}，失败 ${res.failed} 行`)
    } else {
      ElMessage.success(`导入成功 ${res.success} 行到「${currentProjectName.value}」`)
    }
  } catch (e: any) {
    ElMessage.error(`导入失败：${e?.data?.message || e?.message || '未知错误'}`)
  } finally {
    importing.value = false
  }
}

function reset() {
  previewed.value = false
  file.value = null
  fileName.value = ''
  columns.value = []
  previewRows.value = []
  importResult.value = null
}
</script>
