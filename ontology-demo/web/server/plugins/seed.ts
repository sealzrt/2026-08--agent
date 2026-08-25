/**
 * Nitro 启动插件：初始化数据库种子数据（本体 + 示例项目）
 *
 * **仅首次安装时播种**：db 文件不存在（全新初始化）才执行 seedIfEmpty。
 * 用户执行「重置数据库（全删）」后，db 文件仍存在 → server 重启不会重新播种，
 * 系统保持为空状态（符合"删除所有数据包括 demo"的预期）。
 *
 * 依赖方向：plugins/seed → utils/ontology-seed → utils/db（单向，无循环）
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { seedIfEmpty } from '../utils/ontology-seed'

export default defineNitroPlugin(() => {
  const dbPath = resolve(process.cwd(), 'server/data/ontology.db')
  if (!existsSync(dbPath)) {
    seedIfEmpty()
  } else {
    console.log('[seed] 数据库已存在，跳过初始化播种（保持当前数据状态）')
  }
})
