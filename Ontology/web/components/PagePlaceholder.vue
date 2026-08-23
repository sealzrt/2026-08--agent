<script setup lang="ts">
defineProps<{
  title: string
  desc: string
  planned: string[]
}>()
</script>

<template>
  <div class="page-card">
    <h2 class="page-title">{{ title }}</h2>
    <p class="page-desc">{{ desc }}</p>
    <el-alert type="info" :closable="false" show-icon title="M1 骨架占位页 · 后续里程碑实现">
      <div style="line-height: 1.8; margin-top: 4px">
        <div style="font-weight: 500">规划内容：</div>
        <ul style="padding-left: 18px">
          <li v-for="item in planned" :key="item">{{ item }}</li>
        </ul>
      </div>
    </el-alert>
  </div>
</template>
