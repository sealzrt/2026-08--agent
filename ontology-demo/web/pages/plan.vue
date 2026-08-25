<script setup lang="ts">
import { milestoneConfig, taskConfig } from '~/data/entity-configs'

const planTab = ref('milestone')
</script>

<template>
  <div>
    <div class="page-card" style="padding-bottom: 8px">
      <h2 class="page-title">项目计划</h2>
      <p class="page-desc">项目计划与里程碑管理：里程碑起止、任务分解、负责人与依赖关系。</p>
    </div>
    <el-tabs v-model="planTab">
      <el-tab-pane label="里程碑" name="milestone">
        <EntityManager :config="milestoneConfig" />
      </el-tab-pane>
      <el-tab-pane label="任务" name="task">
        <EntityManager :config="taskConfig" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
