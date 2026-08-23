<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { useAppStore } from '~/stores/app'

const route = useRoute()
const app = useAppStore()
const contractId = route.params.id as string

const contract = ref<any>(null)
const project = ref<any>(null)
const elements = ref<any[]>([])
const risks = ref<any[]>([])
const reqs = ref<any[]>([])
const docs = ref<any[]>([])
const loading = ref(true)
const notFound = ref(false)

const categoryLabel: Record<string, string> = {
  amount: '合同金额',
  node: '关键节点',
  milestone: '里程碑',
  keyItem: '关键事项',
  feature: '功能清单',
  deliverable: '交付物',
  warranty: '维保',
  sla: 'SLA 响应时效',
  metric: '关键指标',
  training: '培训'
}

const loadAll = async () => {
  loading.value = true
  try {
    contract.value = await $fetch(`/api/data/contract/${contractId}`)
    const pid = contract.value.projectId
    if (pid) {
      const [p, els, rs, rq, ds] = await Promise.all([
        $fetch(`/api/data/project/${pid}`),
        $fetch(`/api/data/contractElement?projectId=${pid}`),
        $fetch(`/api/data/risk?projectId=${pid}`),
        $fetch(`/api/data/requirement?projectId=${pid}`),
        $fetch(`/api/data/document?projectId=${pid}`)
      ])
      project.value = p
      elements.value = els
      risks.value = rs
      reqs.value = rq
      docs.value = ds
    } else {
      ElMessage.warning('该合同未关联项目，仅展示合同信息')
      const els = await $fetch('/api/data/contractElement')
      elements.value = els.filter((e: any) => e.contractId === contractId)
    }
  } catch (e: any) {
    if (e?.statusCode === 404 || e?.response?.status === 404) {
      notFound.value = true
    } else {
      ElMessage.error(e?.data?.message || e?.message || '加载失败')
    }
  } finally {
    loading.value = false
  }
}
onMounted(loadAll)

// ===== 功能核对：合同功能清单 ↔ 需求 =====
const featureElements = computed(() => elements.value.filter((e) => e.category === 'feature'))

function extractModuleName(content: string): string {
  const m = content.match(/M\d+\s*([^：:]+)[：:]/)
  return m ? m[1].trim() : content.slice(0, 20)
}

interface CheckRow {
  module: string
  content: string
  matchedReq: string[]
  status: 'covered' | 'missing' | 'partial'
}

const checkRows = computed<CheckRow[]>(() => {
  return featureElements.value.map((f) => {
    const modName = extractModuleName(f.content || '')
    const matched = reqs.value.filter((r) => {
      const t = (r.title || '') + (r.description || '')
      const m = modName.length >= 2 ? modName : ''
      return (m && (t.includes(m) || m.includes(t.slice(0, 4)))) || (t.includes((f.content || '').slice(0, 6)))
    })
    const status: CheckRow['status'] = matched.length === 0 ? 'missing' : 'covered'
    return { module: modName, content: f.content || '', matchedReq: matched.map((r) => r.title), status }
  })
})

const coveredCount = computed(() => checkRows.value.filter((r) => r.status === 'covered').length)

// ===== 要素按类别分组 =====
const groupedElements = computed(() => {
  const map: Record<string, any[]> = {}
  for (const e of elements.value) {
    const c = e.category || 'other'
    if (!map[c]) map[c] = []
    map[c].push(e)
  }
  return map
})
</script>

<template>
  <div v-loading="loading">
    <!-- 合同不存在（数据被重置/删除时的友好提示） -->
    <el-result
      v-if="notFound"
      icon="error"
      title="合同不存在"
      sub-title="该合同可能已被删除，或数据库被重置。请返回列表刷新后重试。"
    >
      <template #extra>
        <el-button type="primary" @click="$router.push('/contract')">返回合同列表</el-button>
      </template>
    </el-result>

    <template v-else>
    <!-- 合同信息 -->
    <div class="page-card">
      <div style="display: flex; justify-content: space-between; align-items: center">
        <div>
          <h2 class="page-title">合同详情：{{ contract?.contractNo || '—' }}</h2>
          <p class="page-desc">关联项目：{{ project?.name || '未关联项目' }}</p>
        </div>
        <el-button @click="$router.push('/contract')">← 返回合同列表</el-button>
      </div>

      <el-descriptions v-if="contract" :column="3" border size="small">
        <el-descriptions-item label="合同编号">{{ contract.contractNo || '—' }}</el-descriptions-item>
        <el-descriptions-item label="合同金额">{{ contract.amount ? '¥' + Number(contract.amount).toLocaleString() : '—' }}</el-descriptions-item>
        <el-descriptions-item label="签订日期">{{ contract.signedDate || '—' }}</el-descriptions-item>
        <el-descriptions-item label="验收条款">{{ contract.hasAcceptanceClause ? '明确' : '缺失' }}</el-descriptions-item>
        <el-descriptions-item label="项目范围">{{ (contract.scopeText || '—').slice(0, 50) }}</el-descriptions-item>
        <el-descriptions-item label="关联商机">{{ contract.bidId ? '已关联' : '—' }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 功能核对（核心） -->
    <div class="page-card" v-if="featureElements.length">
      <div style="display: flex; justify-content: space-between; align-items: center">
        <div>
          <h2 class="page-title">功能核对 · 合同功能清单 ↔ 产品需求</h2>
          <p class="page-desc">
            核对合同要求的 {{ featureElements.length }} 个功能模块是否有对应需求覆盖（{{ coveredCount }} 已覆盖）——
            未覆盖的功能是实施遗漏风险点
          </p>
        </div>
      </div>
      <el-table :data="checkRows" border size="small" style="margin-top: 8px">
        <el-table-column prop="module" label="功能模块" width="180" />
        <el-table-column prop="content" label="合同要求" min-width="240" />
        <el-table-column label="对应需求" min-width="160">
          <template #default="{ row }">
            <el-tag v-if="row.matchedReq.length" size="small" type="success" style="margin: 2px" v-for="t in row.matchedReq" :key="t">
              {{ t }}
            </el-tag>
            <span v-else style="color: #f56c6c">无对应需求</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.status === 'covered' ? 'success' : 'danger'" size="small">
              {{ row.status === 'covered' ? '✓ 已覆盖' : '✗ 遗漏' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-row :gutter="16" style="margin-top: 0">
      <!-- 合同要素 -->
      <el-col :span="14">
        <div class="page-card">
          <h2 class="page-title">合同关键要素（{{ elements.length }}）</h2>
          <p class="page-desc">从合同文档自动抽取，作为实施风险判断基线</p>
          <template v-for="(list, cat) in groupedElements" :key="cat">
            <h4 style="margin: 12px 0 6px; color: #185fa5">
              {{ categoryLabel[cat] || cat }}（{{ list.length }}）
            </h4>
            <el-table :data="list" size="small" border>
              <el-table-column prop="content" label="内容" min-width="240" />
              <el-table-column label="置信度" width="80">
                <template #default="{ row }">{{ row.confidence?.toFixed?.(2) ?? '—' }}</template>
              </el-table-column>
            </el-table>
          </template>
          <el-empty v-if="!elements.length" description="暂无合同要素（可在自动识别页从文档抽取）" :image-size="60" />
        </div>
      </el-col>

      <!-- 风险 + 文档 -->
      <el-col :span="10">
        <div class="page-card">
          <h2 class="page-title">项目风险（{{ risks.length }}）</h2>
          <el-table :data="risks" size="small" border>
            <el-table-column prop="title" label="风险" min-width="180" />
            <el-table-column label="等级" width="70">
              <template #default="{ row }">
                <el-tag :type="row.severity === 'high' ? 'danger' : row.severity === 'medium' ? 'warning' : 'success'" size="small">
                  {{ { high: '高', medium: '中', low: '低' }[row.severity] }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div class="page-card">
          <h2 class="page-title">项目文档（{{ docs.length }}）</h2>
          <el-table :data="docs" size="small" border>
            <el-table-column prop="title" label="文档" min-width="160" />
            <el-table-column prop="docType" label="类型" width="100" />
          </el-table>
        </div>
      </el-col>
    </el-row>
    </template>
  </div>
</template>
