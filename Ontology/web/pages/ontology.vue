<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'

const activeTab = ref('classes')

// ===== 数据加载 =====
const classes = ref<any[]>([])
const properties = ref<any[]>([])
const relations = ref<any[]>([])

const loadAll = async () => {
  classes.value = await $fetch('/api/ontology/classes')
  properties.value = await $fetch('/api/ontology/properties')
  relations.value = await $fetch('/api/ontology/relations')
}
onMounted(loadAll)

// ===== 辅助：按 phase 显示中文 =====
const phaseMap: Record<string, string> = {
  presales: '售前',
  implementation: '实施',
  ops: '运维质保',
  common: '通用'
}

// ===== 类的 CRUD =====
const classDialog = ref({ open: false, mode: 'create', form: blankClass() })
function blankClass() {
  return { id: '', name: '', code: '', phase: 'implementation', description: '', parentId: '' }
}
function openCreateClass() {
  classDialog.value = { open: true, mode: 'create', form: blankClass() }
}
function openEditClass(row: any) {
  classDialog.value = { open: true, mode: 'edit', form: { ...row } }
}
async function submitClass() {
  const { form, mode } = classDialog.value
  if (!form.id || !form.name) {
    ElMessage.error('请填写 ID 和名称')
    return
  }
  const payload = { ...form, parentId: form.parentId || undefined }
  try {
    if (mode === 'create') {
      await $fetch('/api/ontology/classes', { method: 'POST', body: payload })
    } else {
      await $fetch(`/api/ontology/classes/${form.id}`, { method: 'PUT', body: payload })
    }
    ElMessage.success('保存成功')
    classDialog.value.open = false
    loadAll()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '保存失败')
  }
}
async function deleteClass(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除类「${row.name}」？关联的属性和关系可能受影响。`, '确认删除', {
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await $fetch(`/api/ontology/classes/${row.id}`, { method: 'DELETE' })
    ElMessage.success('已删除')
    loadAll()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '删除失败')
  }
}

// ===== 属性的 CRUD =====
const propFilterClass = ref<string>('')
const propDialog = ref({ open: false, mode: 'create', form: blankProp() })
function blankProp() {
  return {
    id: '',
    classId: '',
    name: '',
    code: '',
    type: 'string',
    required: false,
    description: '',
    enumValues: ''
  }
}
function openCreateProp() {
  propDialog.value = { open: true, mode: 'create', form: blankProp() }
}
function openEditProp(row: any) {
  const e = row.enumValues
  const enumStr = Array.isArray(e) ? e.join(',') : e || ''
  propDialog.value = { open: true, mode: 'edit', form: { ...row, enumValues: enumStr } }
}
async function submitProp() {
  const { form, mode } = propDialog.value
  if (!form.id || !form.name || !form.classId) {
    ElMessage.error('请填写 ID、名称和所属类')
    return
  }
  const payload: any = { ...form }
  payload.enumValues = form.enumValues
    ? form.enumValues
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    : undefined
  try {
    if (mode === 'create') {
      await $fetch('/api/ontology/properties', { method: 'POST', body: payload })
    } else {
      await $fetch(`/api/ontology/properties/${form.id}`, { method: 'PUT', body: payload })
    }
    ElMessage.success('保存成功')
    propDialog.value.open = false
    loadAll()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '保存失败')
  }
}
async function deleteProp(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除属性「${row.name}」？`, '确认删除', { type: 'warning' })
  } catch {
    return
  }
  try {
    await $fetch(`/api/ontology/properties/${row.id}`, { method: 'DELETE' })
    ElMessage.success('已删除')
    loadAll()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '删除失败')
  }
}

const filteredProps = computed(() =>
  propFilterClass.value
    ? properties.value.filter((p) => p.classId === propFilterClass.value)
    : properties.value
)

const classNameOf = (id: string) => classes.value.find((c) => c.id === id)?.name || id

// ===== 关系的 CRUD =====
const relDialog = ref({ open: false, mode: 'create', form: blankRel() })
function blankRel() {
  return {
    id: '',
    name: '',
    code: '',
    fromClassId: '',
    toClassId: '',
    cardinality: '1-n',
    description: ''
  }
}
function openCreateRel() {
  relDialog.value = { open: true, mode: 'create', form: blankRel() }
}
function openEditRel(row: any) {
  relDialog.value = { open: true, mode: 'edit', form: { ...row } }
}
async function submitRel() {
  const { form, mode } = relDialog.value
  if (!form.id || !form.name || !form.fromClassId || !form.toClassId) {
    ElMessage.error('请填写 ID、名称、起止类')
    return
  }
  try {
    if (mode === 'create') {
      await $fetch('/api/ontology/relations', { method: 'POST', body: form })
    } else {
      await $fetch(`/api/ontology/relations/${form.id}`, { method: 'PUT', body: form })
    }
    ElMessage.success('保存成功')
    relDialog.value.open = false
    loadAll()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '保存失败')
  }
}
async function deleteRel(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除关系「${row.name}」？`, '确认删除', { type: 'warning' })
  } catch {
    return
  }
  try {
    await $fetch(`/api/ontology/relations/${row.id}`, { method: 'DELETE' })
    ElMessage.success('已删除')
    loadAll()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '删除失败')
  }
}
</script>

<template>
  <div>
  <div class="page-card">
    <h2 class="page-title">本体建模工作台</h2>
    <p class="page-desc">
      领域本体的三个核心元素：<b>类（Class）</b>描述业务概念，<b>属性（Property）</b>定义字段，
      <b>关系（Relation）</b>连接类与类。当前本体版本随 SQLite 文件持久化。
    </p>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 12px"
    >
      <template #title>
        本页用于<strong>手动管理</strong>本体。
        想<strong>从文档自动生成新类/属性/关系</strong>，请到「自动识别」页：上传/粘贴文档 →
        运行自动建模 → 建议里的"新增类"项采纳后会自动写回本页显示。
      </template>
    </el-alert>

    <div style="margin-bottom: 12px">
      <el-button type="success" @click="$router.push('/auto-detect')">
        🤖 从文档自动建模（去自动识别页）
      </el-button>
    </div>

    <el-tabs v-model="activeTab">
        <!-- ===== 类 ===== -->
        <el-tab-pane label="类 (Class)" name="classes">
          <div style="margin-bottom: 12px">
            <el-button type="primary" @click="openCreateClass">+ 新增类</el-button>
            <el-tag style="margin-left: 12px" type="info">共 {{ classes.length }} 个</el-tag>
          </div>
          <el-table :data="classes" border size="small" stripe>
            <el-table-column prop="id" label="ID" width="200" />
            <el-table-column prop="name" label="名称" width="140" />
            <el-table-column prop="code" label="英文标识" width="140" />
            <el-table-column label="阶段" width="100">
              <template #default="{ row }">
                <el-tag size="small" :type="row.phase === 'common' ? 'info' : ''">
                  {{ phaseMap[row.phase] || row.phase }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="parentId" label="父类" width="160">
              <template #default="{ row }">
                {{ row.parentId ? classNameOf(row.parentId) : '—' }}
              </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" />
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button size="small" link @click="openEditClass(row)">编辑</el-button>
                <el-button size="small" link type="danger" @click="deleteClass(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- ===== 属性 ===== -->
        <el-tab-pane label="属性 (Property)" name="properties">
          <div style="margin-bottom: 12px; display: flex; gap: 12px; align-items: center">
            <el-button type="primary" @click="openCreateProp">+ 新增属性</el-button>
            <el-select
              v-model="propFilterClass"
              placeholder="按类筛选（全部）"
              clearable
              size="default"
              style="width: 200px"
            >
              <el-option
                v-for="c in classes"
                :key="c.id"
                :label="`${c.name} (${c.id})`"
                :value="c.id"
              />
            </el-select>
            <el-tag type="info">显示 {{ filteredProps.length }} / {{ properties.length }} 个</el-tag>
          </div>
          <el-table :data="filteredProps" border size="small" stripe>
            <el-table-column prop="id" label="ID" width="220" />
            <el-table-column label="所属类" width="140">
              <template #default="{ row }">{{ classNameOf(row.classId) }}</template>
            </el-table-column>
            <el-table-column prop="name" label="属性名" width="120" />
            <el-table-column prop="code" label="字段标识" width="120" />
            <el-table-column prop="type" label="类型" width="80" />
            <el-table-column label="必填" width="60">
              <template #default="{ row }">
                <el-tag v-if="row.required" size="small" type="danger">是</el-tag>
                <span v-else>—</span>
              </template>
            </el-table-column>
            <el-table-column label="枚举值" min-width="160">
              <template #default="{ row }">
                <span v-if="Array.isArray(row.enumValues) && row.enumValues.length">
                  {{ row.enumValues.join(' / ') }}
                </span>
                <span v-else style="color: #909399">—</span>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" />
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button size="small" link @click="openEditProp(row)">编辑</el-button>
                <el-button size="small" link type="danger" @click="deleteProp(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- ===== 关系 ===== -->
        <el-tab-pane label="关系 (Relation)" name="relations">
          <div style="margin-bottom: 12px">
            <el-button type="primary" @click="openCreateRel">+ 新增关系</el-button>
            <el-tag style="margin-left: 12px" type="info">共 {{ relations.length }} 条</el-tag>
          </div>
          <el-table :data="relations" border size="small" stripe>
            <el-table-column prop="id" label="ID" width="220" />
            <el-table-column prop="name" label="关系名" width="120" />
            <el-table-column prop="code" label="英文标识" width="120" />
            <el-table-column label="起点类" width="140">
              <template #default="{ row }">{{ classNameOf(row.fromClassId) }}</template>
            </el-table-column>
            <el-table-column label="→" width="40" align="center">
              <template #default>→</template>
            </el-table-column>
            <el-table-column label="终点类" width="140">
              <template #default="{ row }">{{ classNameOf(row.toClassId) }}</template>
            </el-table-column>
            <el-table-column prop="cardinality" label="基数" width="70" />
            <el-table-column prop="description" label="说明" />
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button size="small" link @click="openEditRel(row)">编辑</el-button>
                <el-button size="small" link type="danger" @click="deleteRel(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- ===== 类 对话框 ===== -->
    <el-dialog
      v-model="classDialog.open"
      :title="classDialog.mode === 'create' ? '新增类' : '编辑类'"
      width="560px"
    >
      <el-form :model="classDialog.form" label-width="100px">
        <el-form-item label="ID *" required>
          <el-input v-model="classDialog.form.id" :disabled="classDialog.mode === 'edit'" placeholder="如 cls_xxx" />
        </el-form-item>
        <el-form-item label="中文名 *" required>
          <el-input v-model="classDialog.form.name" placeholder="如 合同" />
        </el-form-item>
        <el-form-item label="英文标识">
          <el-input v-model="classDialog.form.code" placeholder="如 contract" />
        </el-form-item>
        <el-form-item label="所属阶段">
          <el-select v-model="classDialog.form.phase" style="width: 100%">
            <el-option label="售前" value="presales" />
            <el-option label="实施" value="implementation" />
            <el-option label="运维质保" value="ops" />
            <el-option label="通用" value="common" />
          </el-select>
        </el-form-item>
        <el-form-item label="父类">
          <el-select v-model="classDialog.form.parentId" clearable style="width: 100%">
            <el-option
              v-for="c in classes"
              :key="c.id"
              :label="`${c.name} (${c.id})`"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="classDialog.form.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="classDialog.open = false">取消</el-button>
        <el-button type="primary" @click="submitClass">保存</el-button>
      </template>
    </el-dialog>

    <!-- ===== 属性 对话框 ===== -->
    <el-dialog
      v-model="propDialog.open"
      :title="propDialog.mode === 'create' ? '新增属性' : '编辑属性'"
      width="560px"
    >
      <el-form :model="propDialog.form" label-width="100px">
        <el-form-item label="ID *" required>
          <el-input v-model="propDialog.form.id" :disabled="propDialog.mode === 'edit'" />
        </el-form-item>
        <el-form-item label="所属类 *" required>
          <el-select v-model="propDialog.form.classId" style="width: 100%">
            <el-option
              v-for="c in classes"
              :key="c.id"
              :label="`${c.name} (${c.id})`"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="属性名 *" required>
          <el-input v-model="propDialog.form.name" />
        </el-form-item>
        <el-form-item label="字段标识">
          <el-input v-model="propDialog.form.code" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="propDialog.form.type" style="width: 100%">
            <el-option label="字符串" value="string" />
            <el-option label="长文本" value="text" />
            <el-option label="数字" value="number" />
            <el-option label="日期" value="date" />
            <el-option label="布尔" value="boolean" />
            <el-option label="枚举" value="enum" />
          </el-select>
        </el-form-item>
        <el-form-item label="必填">
          <el-switch v-model="propDialog.form.required" />
        </el-form-item>
        <el-form-item v-if="propDialog.form.type === 'enum'" label="枚举值">
          <el-input
            v-model="propDialog.form.enumValues"
            placeholder="多个值用英文逗号分隔，如 高,中,低"
          />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="propDialog.form.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="propDialog.open = false">取消</el-button>
        <el-button type="primary" @click="submitProp">保存</el-button>
      </template>
    </el-dialog>

    <!-- ===== 关系 对话框 ===== -->
    <el-dialog
      v-model="relDialog.open"
      :title="relDialog.mode === 'create' ? '新增关系' : '编辑关系'"
      width="560px"
    >
      <el-form :model="relDialog.form" label-width="100px">
        <el-form-item label="ID *" required>
          <el-input v-model="relDialog.form.id" :disabled="relDialog.mode === 'edit'" />
        </el-form-item>
        <el-form-item label="关系名 *" required>
          <el-input v-model="relDialog.form.name" />
        </el-form-item>
        <el-form-item label="英文标识">
          <el-input v-model="relDialog.form.code" />
        </el-form-item>
        <el-form-item label="起点类 *" required>
          <el-select v-model="relDialog.form.fromClassId" style="width: 100%">
            <el-option
              v-for="c in classes"
              :key="c.id"
              :label="`${c.name} (${c.id})`"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="终点类 *" required>
          <el-select v-model="relDialog.form.toClassId" style="width: 100%">
            <el-option
              v-for="c in classes"
              :key="c.id"
              :label="`${c.name} (${c.id})`"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="基数">
          <el-select v-model="relDialog.form.cardinality" style="width: 100%">
            <el-option label="1 对 1" value="1-1" />
            <el-option label="1 对 多" value="1-n" />
            <el-option label="多 对 1" value="n-1" />
            <el-option label="多 对 多" value="n-m" />
          </el-select>
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="relDialog.form.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="relDialog.open = false">取消</el-button>
        <el-button type="primary" @click="submitRel">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
