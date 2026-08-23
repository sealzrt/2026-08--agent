<script setup lang="ts">
import { contractConfig, contractElementConfig } from '~/data/entity-configs'

const contractTab = ref('contract')
</script>

<template>
  <div>
    <el-tabs v-model="contractTab">
      <el-tab-pane label="合同管理" name="contract">
        <EntityManager :config="contractConfig" />
      </el-tab-pane>
      <el-tab-pane label="合同关键要素" name="elements">
        <EntityManager :config="contractElementConfig" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
