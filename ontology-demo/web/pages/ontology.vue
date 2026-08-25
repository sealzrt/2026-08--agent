<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { Graph } from '@antv/g6'

// ===== 数据加载 =====
const classes = ref<any[]>([])
const properties = ref<any[]>([])
const relations = ref<any[]>([])

const loadAll = async () => {
  classes.value = await $fetch('/api/ontology/classes')
  properties.value = await $fetch('/api/ontology/properties')
  relations.value = await $fetch('/api/ontology/relations')
}
onMounted(async () => {
  await loadAll()
  nextTick(() => renderGraph())
})

// ===== 辅助：按 phase 显示中文 =====
const phaseMap: Record<string, string> = {
  presales: '售前',
  implementation: '实施',
  ops: '运维质保',
  common: '通用'
}
const PHASE_COLORS: Record<string, string> = {
  presales: '#d85a30',
  implementation: '#185fa5',
  ops: '#0f6e56',
  common: '#5f5e5a'
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
    await loadAll()
    nextTick(() => renderGraph())
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
    if (selectedClassId.value === row.id) selectedClassId.value = ''
    await loadAll()
    nextTick(() => renderGraph())
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '删除失败')
  }
}

// ===== 属性的 CRUD =====
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
function openCreateProp(classId?: string) {
  propDialog.value = { open: true, mode: 'create', form: { ...blankProp(), classId: classId || '' } }
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
    await loadAll()
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
    await loadAll()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '删除失败')
  }
}

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
function openCreateRel(fromClassId?: string) {
  relDialog.value = { open: true, mode: 'create', form: { ...blankRel(), fromClassId: fromClassId || '' } }
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
    await loadAll()
    nextTick(() => renderGraph())
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
    await loadAll()
    nextTick(() => renderGraph())
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '删除失败')
  }
}

// ===================== 图形视图（类=区块 / 关系=连线） =====================
const graphContainer = ref<HTMLElement | null>(null)
const selectedClassId = ref<string>('')
let graph: any = null

const selectedClass = computed(() => classes.value.find((c) => c.id === selectedClassId.value) || null)
const selectedProps = computed(() =>
  properties.value.filter((p) => p.classId === selectedClassId.value)
)
const selectedRels = computed(() =>
  relations.value.filter(
    (r) => r.fromClassId === selectedClassId.value || r.toClassId === selectedClassId.value
  )
)

function renderGraph() {
  if (!graphContainer.value || !classes.value.length) return
  const nodes = classes.value.map((c) => ({
    id: c.id,
    data: { kind: 'class', code: c.code },
    style: {
      labelText: c.name,
      labelPlacement: 'bottom',
      labelFontSize: 12,
      fill: PHASE_COLORS[c.phase] || '#888',
      size: c.id === selectedClassId.value ? 42 : 34,
      stroke: c.id === selectedClassId.value ? '#ffd666' : undefined,
      lineWidth: c.id === selectedClassId.value ? 3 : undefined
    }
  }))
  const edges = relations.value
    .filter((r) => r.fromClassId && r.toClassId)
    .map((r) => ({
      source: r.fromClassId,
      target: r.toClassId,
      style: {
        labelText: `${r.name}${r.cardinality ? ` (${r.cardinality})` : ''}`,
        labelBackground: true,
        endArrow: true,
        labelFontSize: 9
      }
    }))

  if (graph) graph.destroy()
  graph = new Graph({
    container: graphContainer.value,
    autoFit: 'view',
    data: { nodes, edges },
    node: { style: { labelPlacement: 'bottom' } },
    edge: { style: { endArrow: true, labelFontSize: 9 } },
    layout: { type: 'force', linkDistance: 150, nodeStrength: 380, preventOverlap: true }
  })
  graph.on('node:click', (evt: any) => {
    const id = evt.target.id
    if (selectedClassId.value === id) return
    // 局部更新（updateNodeData + draw）：不重建图、不重排布局，避免整图跳动
    const updates: any[] = []
    if (selectedClassId.value) {
      updates.push({ id: selectedClassId.value, style: { size: 34, stroke: undefined, lineWidth: undefined } })
    }
    selectedClassId.value = id
    updates.push({ id, style: { size: 42, stroke: '#ffd666', lineWidth: 3 } })
    graph.updateNodeData(updates)
    graph.draw()
  })
  graph.render()
}
</script>

<template>
  <div>
    <div class="page-card">
      <h2 class="page-title">本体建模工作台</h2>
      <p class="page-desc">
        本体 = 全局知识骨架（所有项目共享）：<b>类</b>是概念区块，<b>属性</b>定义字段，<b>关系</b>连接概念。
        <b>点击类区块</b>可在右侧查看/编辑属性与关系。
      </p>

      <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px; flex-wrap: wrap">
        <el-button type="primary" @click="openCreateClass">+ 新增类</el-button>
        <el-button type="success" @click="$router.push('/auto-detect')">🤖 从文档自动建模</el-button>
        <el-tag v-for="(c, k) in PHASE_COLORS" :key="k" size="small" :color="c" style="color: #fff; border: none">
          {{ phaseMap[k] }}
        </el-tag>
        <el-tag size="small" type="info">{{ classes.length }} 类 · {{ properties.length }} 属性 · {{ relations.length }} 关系</el-tag>
      </div>

      <!-- 图形视图 -->
      <el-row :gutter="16">
        <el-col :span="16">
          <div ref="graphContainer" style="height: 560px; border: 1px solid #ebeef5; border-radius: 8px" />
        </el-col>
        <el-col :span="8">
          <!-- 类详情面板 -->
          <div v-if="selectedClass" class="class-panel">
            <div style="display: flex; justify-content: space-between; align-items: center">
              <el-tag size="small" :color="PHASE_COLORS[selectedClass.phase] || '#888'" style="color: #fff; border: none">
                {{ selectedClass.name }}
              </el-tag>
              <div>
                <el-button size="small" link @click="openEditClass(selectedClass)">编辑类</el-button>
                <el-button size="small" link type="danger" @click="deleteClass(selectedClass)">删除</el-button>
              </div>
            </div>
            <div style="font-size: 12px; color: #606266; margin: 6px 0">
              ID: {{ selectedClass.id }} · {{ phaseMap[selectedClass.phase] || selectedClass.phase }}
            </div>
            <div style="font-size: 12px; color: #909399; margin-bottom: 10px">
              {{ selectedClass.description || '（无说明）' }}
            </div>

            <!-- 属性 -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px">
              <b style="font-size: 13px">属性（{{ selectedProps.length }}）</b>
              <el-button size="small" type="primary" plain @click="openCreateProp(selectedClass.id)">+ 属性</el-button>
            </div>
            <el-table :data="selectedProps" size="small" border max-height="180" empty-text="暂无属性">
              <el-table-column prop="name" label="属性" width="90" />
              <el-table-column prop="type" label="类型" width="70" />
              <el-table-column label="必填" width="50">
                <template #default="{ row }">
                  <el-tag v-if="row.required" size="small" type="danger">必</el-tag>
                  <span v-else>—</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="{ row }">
                  <el-button size="small" link @click="openEditProp(row)">编</el-button>
                  <el-button size="small" link type="danger" @click="deleteProp(row)">删</el-button>
                </template>
              </el-table-column>
            </el-table>

            <!-- 关系 -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 12px 0 6px">
              <b style="font-size: 13px">关联关系（{{ selectedRels.length }}）</b>
              <el-button size="small" type="primary" plain @click="openCreateRel(selectedClass.id)">+ 关系</el-button>
            </div>
            <el-table :data="selectedRels" size="small" border max-height="160" empty-text="暂无关联关系">
              <el-table-column label="关系" min-width="150">
                <template #default="{ row }">
                  <span style="font-size: 12px">
                    {{ classNameOf(row.fromClassId) }} ─{{ row.name }}→ {{ classNameOf(row.toClassId) }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="{ row }">
                  <el-button size="small" link @click="openEditRel(row)">编</el-button>
                  <el-button size="small" link type="danger" @click="deleteRel(row)">删</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <el-empty v-else description="点击左侧类区块，查看/编辑其属性与关系" :image-size="60" />
        </el-col>
      </el-row>
    </div>

    <!-- ===== 类 对话框 ===== -->
    <el-dialog v-model="classDialog.open" :title="classDialog.mode === 'create' ? '新增类' : '编辑类'" width="560px">
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
            <el-option v-for="c in classes" :key="c.id" :label="`${c.name} (${c.id})`" :value="c.id" />
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
    <el-dialog v-model="propDialog.open" :title="propDialog.mode === 'create' ? '新增属性' : '编辑属性'" width="560px">
      <el-form :model="propDialog.form" label-width="100px">
        <el-form-item label="ID *" required>
          <el-input v-model="propDialog.form.id" :disabled="propDialog.mode === 'edit'" />
        </el-form-item>
        <el-form-item label="所属类 *" required>
          <el-select v-model="propDialog.form.classId" style="width: 100%">
            <el-option v-for="c in classes" :key="c.id" :label="`${c.name} (${c.id})`" :value="c.id" />
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
          <el-input v-model="propDialog.form.enumValues" placeholder="逗号分隔，如 high,medium,low" />
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
    <el-dialog v-model="relDialog.open" :title="relDialog.mode === 'create' ? '新增关系' : '编辑关系'" width="560px">
      <el-form :model="relDialog.form" label-width="100px">
        <el-form-item label="ID *" required>
          <el-input v-model="relDialog.form.id" :disabled="relDialog.mode === 'edit'" placeholder="如 rel_a_b" />
        </el-form-item>
        <el-form-item label="关系名 *" required>
          <el-input v-model="relDialog.form.name" placeholder="如 约束 / 包含 / 来源于" />
        </el-form-item>
        <el-form-item label="英文标识">
          <el-input v-model="relDialog.form.code" />
        </el-form-item>
        <el-form-item label="起点类 *" required>
          <el-select v-model="relDialog.form.fromClassId" style="width: 100%">
            <el-option v-for="c in classes" :key="c.id" :label="`${c.name} (${c.id})`" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="终点类 *" required>
          <el-select v-model="relDialog.form.toClassId" style="width: 100%">
            <el-option v-for="c in classes" :key="c.id" :label="`${c.name} (${c.id})`" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="基数">
          <el-select v-model="relDialog.form.cardinality" style="width: 100%">
            <el-option v-for="c in ['1-1', '1-n', 'n-1', 'n-m']" :key="c" :label="c" :value="c" />
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

<style scoped>
.class-panel {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  background: #fafbfc;
  height: 560px;
  overflow: auto;
}
</style>
