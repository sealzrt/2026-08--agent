import { defineStore } from 'pinia'

export type Role = 'pm' | 'director'

/**
 * 全局应用状态
 * - role: 当前视角（项目经理 / 项目总监）
 * - currentProjectId: 当前选中的项目（总监视角跨项目总览时为空）
 */
export const useAppStore = defineStore('app', {
  state: (): { role: Role; currentProjectId: string } => ({
    role: 'pm',
    currentProjectId: ''
  }),
  actions: {
    setRole(role: Role) {
      this.role = role
    },
    setCurrentProject(id: string) {
      this.currentProjectId = id
    }
  }
})
