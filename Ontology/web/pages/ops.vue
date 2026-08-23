<script setup lang="ts">
import { opsEventConfig, slaConfig, warrantyConfig } from '~/data/entity-configs'

const opsTab = ref('event')
</script>

<template>
  <div>
    <div class="page-card" style="padding-bottom: 8px">
      <h2 class="page-title">运维管理</h2>
      <p class="page-desc">运维质保阶段：运维事件/工单、SLA 履行状态、质保期跟踪。</p>
    </div>
    <el-tabs v-model="opsTab">
      <el-tab-pane label="运维事件" name="event">
        <EntityManager :config="opsEventConfig" />
      </el-tab-pane>
      <el-tab-pane label="SLA 配置" name="sla">
        <EntityManager :config="slaConfig" />
      </el-tab-pane>
      <el-tab-pane label="质保期" name="warranty">
        <EntityManager :config="warrantyConfig" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
