<script setup lang="ts">
import { contractConfig, contractElementConfig } from '~/data/entity-configs'

const contractTab = ref('contract')

function goDetail(row: any) {
  navigateTo(`/contract/${row.id}`)
}
</script>

<template>
  <div>
    <el-tabs v-model="contractTab">
      <el-tab-pane label="合同管理" name="contract">
        <EntityManager :config="contractConfig">
          <template #rowActions="{ row }">
            <el-button size="small" link type="primary" @click="goDetail(row)">详情</el-button>
          </template>
        </EntityManager>
      </el-tab-pane>
      <el-tab-pane label="合同关键要素" name="elements">
        <EntityManager :config="contractElementConfig" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
