<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { bidConfig } from '~/data/entity-configs'

/** 售前「中标 → 生成合同」（有合同必有售前） */
async function winBid(row: any) {
  try {
    await ElMessageBox.confirm(
      `确认商机「${row.name}」中标？将自动生成关联合同（合同必挂售前）。`,
      '中标确认',
      { type: 'warning' }
    )
  } catch {
    return
  }
  try {
    const res: any = await $fetch('/api/data/contract', {
      method: 'POST',
      body: {
        projectId: row.projectId || undefined,
        bidId: row.id,
        contractNo: `HT-${new Date().getFullYear()}-${row.id.slice(0, 4)}`,
        amount: row.quote,
        signedDate: new Date().toISOString().slice(0, 10),
        scopeText: row.proposalText || `商机：${row.name}；客户：${row.customer}`,
        hasAcceptanceClause: false
      }
    })
    await $fetch(`/api/data/bid/${row.id}`, {
      method: 'PUT',
      body: { status: '已中标' }
    })
    ElMessage.success(`已生成合同：${res.contractNo}，可在「合同管理」查看`)
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '操作失败')
  }
}
</script>

<template>
  <EntityManager :config="bidConfig">
    <template #rowActions="{ row }">
      <el-button size="small" link type="success" @click="winBid(row)">中标→合同</el-button>
    </template>
  </EntityManager>
</template>
