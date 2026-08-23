import { defineStore } from 'pinia'

export type Role = 'pm' | 'director'

/**
 * 全局应用状态（项目主线维度）
 * - role: 当前视角（项目经理 / 项目总监）
 * - currentProjectId: 当前选中的项目（空 = 全部项目/总监视角）
 * - projects: 项目列表（顶栏选择器 + 各页联动）
 */
export const useAppStore = defineStore('app', {
  state: (): { role: Role; currentProjectId: string; projects: any[] } => ({
    role: 'pm',
    currentProjectId: '',
    projects: []
  }),
  actions: {
    setRole(role: Role) {
      this.role = role
    },
    setCurrentProject(id: string) {
      this.currentProjectId = id
    },
    /** 加载项目列表（顶栏选择器用） */
    async loadProjects() {
      try {
        this.projects = await $fetch('/api/data/project')
      } catch {
        this.projects = []
      }
    }
  }
})
