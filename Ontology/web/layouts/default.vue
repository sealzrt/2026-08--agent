<script setup lang="ts">
import { useAppStore } from '~/stores/app'

const app = useAppStore()
const router = useRouter()

onMounted(async () => {
  await app.loadProjects()
  // 项目维度强制：无当前项目时自动选中第一个
  if (!app.currentProjectId && app.projects.length) {
    app.setCurrentProject(app.projects[0].id)
  }
})

// 项目列表清空（重置/删除最后一个项目）时，清空当前项目选择，避免顶栏残留
watch(
  () => app.projects.length,
  (len) => {
    if (len === 0 && app.currentProjectId) {
      app.setCurrentProject('')
    } else if (len > 0 && app.currentProjectId && !app.projects.find((p) => p.id === app.currentProjectId)) {
      // 当前选中的项目已被删除 → 切到第一个
      app.setCurrentProject(app.projects[0].id)
    }
  }
)

const currentProjectName = computed(
  () => app.projects.find((p) => p.id === app.currentProjectId)?.name || ''
)

// ===== 新建项目：进入分步向导 =====
const NEW_PROJECT = '__new__'

function onProjectChange(val: string) {
  if (val === NEW_PROJECT) {
    // 还原选择值，进入新建项目向导
    app.currentProjectId = app.currentProjectId || ''
    router.push('/project/new')
    return
  }
  app.setCurrentProject(val)
}

const menuGroups = [
  {
    label: '总览',
    items: [
      { path: '/', label: '仪表盘', icon: '📊' },
      { path: '/project', label: '项目总览', icon: '📁' }
    ]
  },
  {
    label: '本体',
    items: [
      { path: '/ontology', label: '本体建模', icon: '🧬' },
      { path: '/graph', label: '关系图谱', icon: '🕸️' }
    ]
  },
  {
    label: '业务管理',
    items: [
      { path: '/presales', label: '售前管理', icon: '📋' },
      { path: '/contract', label: '合同管理', icon: '📄' },
      { path: '/features', label: '功能清单', icon: '🧩' },
      { path: '/plan', label: '项目计划', icon: '🗓️' },
      { path: '/progress', label: '进度跟踪', icon: '📈' },
      { path: '/requirement', label: '需求管理', icon: '📝' },
      { path: '/solution', label: '方案管理', icon: '🛠️' },
      { path: '/risk', label: '风险中心', icon: '⚠️' },
      { path: '/ops', label: '运维管理', icon: '🔧' },
      { path: '/stakeholder', label: '干系人', icon: '👥' }
    ]
  },
  {
    label: '能力',
    items: [
      { path: '/documents', label: '文档中心', icon: '📚' },
      { path: '/auto-detect', label: '自动识别', icon: '🤖' },
      { path: '/rules', label: '规则引擎', icon: '⚙️' },
      { path: '/import', label: '数据导入', icon: '📥' },
      { path: '/settings', label: '数据管理', icon: '🗄️' }
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
            :model-value="app.currentProjectId"
            placeholder="选择当前项目"
            size="small"
            style="width: 240px"
            @change="onProjectChange"
          >
            <el-option v-for="p in app.projects" :key="p.id" :label="p.name" :value="p.id" />
            <el-option :value="NEW_PROJECT" label="＋ 新建项目…" />
          </el-select>
          <el-button size="small" type="primary" plain style="margin-left: 8px" @click="router.push('/project/new')">
            ＋ 新建项目
          </el-button>
          <el-tag v-if="currentProjectName" type="primary" size="small" effect="plain" style="margin-left: 8px">
            {{ currentProjectName }}
          </el-tag>
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
