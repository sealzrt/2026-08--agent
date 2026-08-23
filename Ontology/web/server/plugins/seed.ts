/**
 * Nitro 启动插件：初始化数据库种子数据（本体 + 示例项目）
 *
 * 放在 server/plugins 目录，Nitro 在服务启动时自动执行。
 * 依赖方向：plugins/seed → utils/ontology-seed → utils/db（单向，无循环）
 */

import { seedIfEmpty } from '../utils/ontology-seed'

export default defineNitroPlugin(() => {
  seedIfEmpty()
})
