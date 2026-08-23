<script setup lang="ts">
import { useAppStore } from '~/stores/app'

const app = useAppStore()

const menuGroups = [
  {
    label: '总览',
    items: [{ path: '/', label: '仪表盘', icon: '📊' }]
  },
  {
    label: '本体',
    items: [{ path: '/ontology', label: '本体建模', icon: '🧬' }]
  },
  {
    label: '业务管理',
    items: [
      { path: '/presales', label: '售前管理', icon: '📋' },
      { path: '/contract', label: '合同管理', icon: '📄' },
      { path: '/plan', label: '项目计划', icon: '🗓️' },
      { path: '/progress', label: '进度跟踪', icon: '📈' },
      { path: '/requirement', label: '需求管理', icon: '📝' },
      { path: '/solution', label: '方案管理', icon: '🛠️' },
      { path: '/risk', label: '风险中心', icon: '⚠️' },
      { path: '/ops', label: '运维管理', icon: '🔧' }
    ]
  },
  {
    label: '能力',
    items: [
      { path: '/documents', label: '文档中心', icon: '📚' },
      { path: '/auto-detect', label: '自动识别', icon: '🤖' },
      { path: '/graph', label: '关系图谱', icon: '🕸️' },
      { path: '/rules', label: '规则引擎', icon: '⚙️' },
      { path: '/import', label: '数据导入', icon: '📥' }
    ]
  }
]
</script>

<template>
  <el-container style="height: 100%">
    <el-aside width="220px" class="aside">
      <div class="logo">
        <span class="logo-dot" />
        <span class="logo-text">Ontology Web</span>
      </div>
      <el-scrollbar>
        <el-menu
          router
          :default-active="$route.path"
          background-color="#1d2b45"
          text-color="#c0c8d8"
          active-text-color="#ffffff"
        >
          <template v-for="group in menuGroups" :key="group.label">
            <div class="menu-group-label">{{ group.label }}</div>
            <el-menu-item v-for="item in group.items" :key="item.path" :index="item.path">
              <span class="menu-icon">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </el-menu-item>
          </template>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">项目实施全链路风险管控</div>
        <div class="header-right">
          <el-select
            v-model="app.role"
            size="small"
            style="width: 140px; margin-right: 12px"
            @change="app.setRole"
          >
            <el-option label="项目经理视角" value="pm" />
            <el-option label="项目总监视角" value="director" />
          </el-select>
          <el-tag type="info" size="small">本地 SQLite · M1 骨架</el-tag>
        </div>
      </el-header>
      <el-main class="main">
        <slot />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.aside {
  background: #1d2b45;
  display: flex;
  flex-direction: column;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.logo-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #4f9cf9;
  flex-shrink: 0;
}

.logo-text {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}

.aside :deep(.el-menu) {
  border-right: none;
}

.aside :deep(.el-menu-item.is-active) {
  background: #2c4a7c;
}

.menu-group-label {
  color: #6b7a94;
  font-size: 12px;
  padding: 14px 20px 6px;
}

.menu-icon {
  margin-right: 8px;
}

.header {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.main {
  padding: 16px;
  overflow: auto;
}
</style>
