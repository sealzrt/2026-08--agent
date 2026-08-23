<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import type { EntityConfig, FieldConfig } from '~/data/entity-configs'

const props = defineProps<{ config: EntityConfig }>()

// ===== 数据 =====
const rows = ref<any[]>([])
const loading = ref(false)
const projects = ref<any[]>([])
const currentProject = ref<string>('')
const showAllProjects = ref(true)

const tableFields = computed(() => props.config.fields.filter((f) => !f.hideInTable))

const loadRows = async () => {
  loading.value = true
  try {
    const q = currentProject.value ? `?projectId=${currentProject.value}` : ''
    rows.value = await $fetch(`/api/data/${props.config.entity}${q}`)
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const loadProjects = async () => {
  try {
    projects.value = await $fetch('/api/data/project')
  } catch {
    /* 项目加载失败不阻塞 */
  }
}

const onProjectChange = (val: string) => {
  showAllProjects.value = !val
  loadRows()
}

onMounted(() => {
  loadProjects()
  loadRows()
})

// ===== 对话框 =====
const dialog = ref({ open: false, mode: 'create', form: {} as Record<string, any> })

function blankForm(): Record<string, any> {
  const f: Record<string, any> = { projectId: currentProject.value || undefined }
  for (const field of props.config.fields) {
    if (field.type === 'boolean') f[field.key] = false
    else if (field.type === 'number') f[field.key] = undefined
    else f[field.key] = ''
  }
  return f
}

function openCreate() {
  dialog.value = { open: true, mode: 'create', form: blankForm() }
}

function openEdit(row: any) {
  dialog.value = { open: true, mode: 'edit', form: { ...row } }
}

async function submit() {
  const { form, mode } = dialog.value
  const required = props.config.fields.filter((f) => f.required)
  const missing = required.find((f) => !form[f.key] && form[f.key] !== false)
  if (missing) {
    ElMessage.error(`请填写：${missing.label}`)
    return
  }
  try {
    if (mode === 'create') {
      await $fetch(`/api/data/${props.config.entity}`, { method: 'POST', body: form })
    } else {
      await $fetch(`/api/data/${props.config.entity}/${form.id}`, { method: 'PUT', body: form })
    }
    ElMessage.success('保存成功')
    dialog.value.open = false
    loadRows()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '保存失败')
  }
}

async function remove(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除该记录？`, '确认删除', { type: 'warning' })
  } catch {
    return
  }
  try {
    await $fetch(`/api/data/${props.config.entity}/${row.id}`, { method: 'DELETE' })
    ElMessage.success('已删除')
    loadRows()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '删除失败')
  }
}

// ===== 显示辅助 =====
const projectName = (id?: string) =>
  projects.value.find((p) => p.id === id)?.name || (id ? id : '—')

function cellText(row: any, f: FieldConfig) {
  const v = row[f.key]
  if (v === null || v === undefined) return '—'
  if (f.type === 'boolean') return v ? '是' : '否'
  if (f.type === 'number' && f.key === 'probability') return v
  if (f.type === 'enum' && f.options?.length) {
    const opt = f.options.find((o) => o === v)
    if (f.key === 'severity') return { high: '高', medium: '中', low: '低' }[v] ?? v
    if (f.key === 'source') return { manual: '手动', rule: '规则', relation: '推演', llm: 'LLM' }[v] ?? v
    return opt ?? v
  }
  return v
}
</script>

<template>
  <div class="page-card">
    <div style="display: flex; justify-content: space-between; align-items: flex-start">
      <div>
        <h2 class="page-title">{{ config.title }}</h2>
        <p class="page-desc">{{ config.desc }}</p>
      </div>
      <div style="display: flex; gap: 8px; align-items: center">
        <el-select
          v-model="currentProject"
          placeholder="全部项目"
          clearable
          size="default"
          style="width: 200px"
          @change="onProjectChange"
        >
          <el-option
            v-for="p in projects"
            :key="p.id"
            :label="p.name"
            :value="p.id"
          />
        </el-select>
        <el-button type="primary" @click="openCreate">+ 新增</el-button>
      </div>
    </div>

    <el-table :data="rows" border size="small" stripe v-loading="loading" style="margin-top: 8px">
      <el-table-column v-if="!showAllProjects" label="项目" width="160">
        <template #default="{ row }">{{ projectName(row.projectId) }}</template>
      </el-table-column>
      <el-table-column
        v-for="f in tableFields"
        :key="f.key"
        :label="f.label"
        :prop="f.key"
        :min-width="f.type === 'text' ? 220 : 120"
      >
        <template #default="{ row }">
          <el-tag v-if="f.type === 'enum'" size="small" :type="f.key === 'severity' ? (row.severity === 'high' ? 'danger' : row.severity === 'medium' ? 'warning' : 'success') : ''">
            {{ cellText(row, f) }}
          </el-tag>
          <span v-else>{{ cellText(row, f) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button size="small" link @click="openEdit(row)">编辑</el-button>
          <el-button size="small" link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="暂无数据，点击右上角「+ 新增」录入" :image-size="60" />
      </template>
    </el-table>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialog.open"
      :title="dialog.mode === 'create' ? `新增${config.title}` : `编辑${config.title}`"
      width="600px"
    >
      <el-form :model="dialog.form" label-width="120px">
        <el-form-item v-if="dialog.mode === 'create'" label="所属项目">
          <el-select v-model="dialog.form.projectId" clearable style="width: 100%">
            <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>

        <el-form-item
          v-for="f in config.fields"
          :key="f.key"
          :label="f.label + (f.required ? ' *' : '')"
          :required="f.required"
        >
          <el-input
            v-if="f.type === 'string'"
            v-model="dialog.form[f.key]"
            :placeholder="f.placeholder"
          />
          <el-input
            v-else-if="f.type === 'text'"
            v-model="dialog.form[f.key]"
            type="textarea"
            :rows="3"
            :placeholder="f.placeholder"
          />
          <el-input-number
            v-else-if="f.type === 'number'"
            v-model="dialog.form[f.key]"
            :min="f.key.includes('probability') || f.key.includes('impact') ? 0 : undefined"
            :max="f.key.includes('probability') || f.key.includes('impact') ? 1 : undefined"
            :step="f.key.includes('probability') || f.key.includes('impact') ? 0.1 : 1"
            style="width: 100%"
          />
          <el-date-picker
            v-else-if="f.type === 'date'"
            v-model="dialog.form[f.key]"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            placeholder="选择日期"
          />
          <el-switch v-else-if="f.type === 'boolean'" v-model="dialog.form[f.key]" />
          <el-select v-else-if="f.type === 'enum'" v-model="dialog.form[f.key]" style="width: 100%">
            <el-option v-for="o in f.options" :key="o" :label="o" :value="o" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.open = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
