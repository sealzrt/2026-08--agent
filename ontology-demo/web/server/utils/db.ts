/**
 * SQLite 存储层（node:sqlite 内置模块，零安装）
 *
 * - 数据库文件：server/data/ontology.db（已 gitignore）
 * - 启动时自动建表（幂等）
 * - 提供通用 CRUD：listRows / getById / insertRow / updateRow / deleteRow
 * - 表名白名单 + 列名动态校验（PRAGMA table_info），防止注入
 */

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const dataDir = resolve(process.cwd(), 'server/data')
mkdirSync(dataDir, { recursive: true })

export const db = new DatabaseSync(resolve(dataDir, 'ontology.db'))

/** 业务实体表：API 实体名 → SQLite 表名 */
export const ENTITY_TABLES: Record<string, string> = {
  bid: 'bid',
  contract: 'contract',
  contractElement: 'contract_element',
  feature: 'feature',
  project: 'project',
  milestone: 'milestone',
  task: 'task',
  progress: 'progress',
  requirement: 'requirement',
  solution: 'solution',
  risk: 'risk',
  opsEvent: 'ops_event',
  sla: 'sla',
  warranty: 'warranty',
  stakeholder: 'stakeholder',
  document: 'document'
}

/** 本体表：API 分段 → SQLite 表名 */
export const ONTOLOGY_TABLES: Record<string, string> = {
  classes: 'ontology_class',
  properties: 'ontology_property',
  relations: 'ontology_relation'
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS ontology_class (
  id TEXT PRIMARY KEY, name TEXT, code TEXT, description TEXT, phase TEXT, parent_id TEXT
);
CREATE TABLE IF NOT EXISTS ontology_property (
  id TEXT PRIMARY KEY, class_id TEXT, name TEXT, code TEXT, type TEXT,
  required INTEGER DEFAULT 0, description TEXT, enum_values TEXT
);
CREATE TABLE IF NOT EXISTS ontology_relation (
  id TEXT PRIMARY KEY, name TEXT, code TEXT, from_class_id TEXT, to_class_id TEXT,
  description TEXT, cardinality TEXT
);

CREATE TABLE IF NOT EXISTS bid (
  id TEXT PRIMARY KEY, project_id TEXT, created_at TEXT, updated_at TEXT,
  name TEXT, customer TEXT, status TEXT, quote REAL, review_status TEXT, proposal_text TEXT
);
CREATE TABLE IF NOT EXISTS contract (
  id TEXT PRIMARY KEY, project_id TEXT, created_at TEXT, updated_at TEXT,
  contract_no TEXT, amount REAL, signed_date TEXT, scope_text TEXT,
  has_acceptance_clause INTEGER DEFAULT 0, payment_milestones TEXT, bid_id TEXT
);
CREATE TABLE IF NOT EXISTS project (
  id TEXT PRIMARY KEY, project_id TEXT, created_at TEXT, updated_at TEXT,
  name TEXT, customer TEXT, manager TEXT, director TEXT,
  start_date TEXT, end_date TEXT, status TEXT, phase TEXT
);
CREATE TABLE IF NOT EXISTS milestone (
  id TEXT PRIMARY KEY, project_id TEXT, created_at TEXT, updated_at TEXT,
  name TEXT, plan_start TEXT, plan_end TEXT, actual_end TEXT, delay_days REAL DEFAULT 0, status TEXT
);
CREATE TABLE IF NOT EXISTS task (
  id TEXT PRIMARY KEY, project_id TEXT, created_at TEXT, updated_at TEXT,
  name TEXT, owner TEXT, plan_start TEXT, plan_end TEXT, status TEXT
);
CREATE TABLE IF NOT EXISTS progress (
  id TEXT PRIMARY KEY, project_id TEXT, created_at TEXT, updated_at TEXT,
  milestone_id TEXT, progress_percent REAL DEFAULT 0, delay_days REAL DEFAULT 0,
  is_blocked INTEGER DEFAULT 0, status TEXT
);
CREATE TABLE IF NOT EXISTS requirement (
  id TEXT PRIMARY KEY, project_id TEXT, created_at TEXT, updated_at TEXT,
  req_no TEXT, title TEXT, priority TEXT, status TEXT, source TEXT,
  change_count REAL DEFAULT 0, is_confirmed INTEGER DEFAULT 0, description TEXT
);
CREATE TABLE IF NOT EXISTS solution (
  id TEXT PRIMARY KEY, project_id TEXT, created_at TEXT, updated_at TEXT,
  title TEXT, type TEXT, review_status TEXT, tech_stack TEXT,
  has_unresolved_items INTEGER DEFAULT 0, content TEXT
);
CREATE TABLE IF NOT EXISTS risk (
  id TEXT PRIMARY KEY, project_id TEXT, created_at TEXT, updated_at TEXT,
  title TEXT, risk_type TEXT, severity TEXT, probability REAL DEFAULT 0,
  impact REAL DEFAULT 0, mitigation TEXT, mitigation_status TEXT,
  status TEXT, source TEXT, related_entity_id TEXT
);
CREATE TABLE IF NOT EXISTS contract_element (
  id TEXT PRIMARY KEY, project_id TEXT, contract_id TEXT, created_at TEXT, updated_at TEXT,
  category TEXT, content TEXT, detail TEXT, confidence REAL DEFAULT 0, status TEXT
);
CREATE TABLE IF NOT EXISTS feature (
  id TEXT PRIMARY KEY, project_id TEXT, contract_id TEXT, created_at TEXT, updated_at TEXT,
  name TEXT, code TEXT, description TEXT, priority TEXT, status TEXT, source TEXT
);
CREATE TABLE IF NOT EXISTS ops_event (
  id TEXT PRIMARY KEY, project_id TEXT, created_at TEXT, updated_at TEXT,
  ticket_no TEXT, description TEXT, sla_status TEXT,
  response_hours REAL DEFAULT 0, resolution_hours REAL DEFAULT 0, status TEXT
);
CREATE TABLE IF NOT EXISTS sla (
  id TEXT PRIMARY KEY, project_id TEXT, created_at TEXT, updated_at TEXT,
  name TEXT, response_limit_hours REAL DEFAULT 0, resolution_limit_hours REAL DEFAULT 0, penalty TEXT
);
CREATE TABLE IF NOT EXISTS warranty (
  id TEXT PRIMARY KEY, project_id TEXT, created_at TEXT, updated_at TEXT,
  start_date TEXT, end_date TEXT, coverage TEXT
);
CREATE TABLE IF NOT EXISTS stakeholder (
  id TEXT PRIMARY KEY, project_id TEXT, created_at TEXT, updated_at TEXT,
  name TEXT, role TEXT, party TEXT, contact TEXT
);
CREATE TABLE IF NOT EXISTS document (
  id TEXT PRIMARY KEY, project_id TEXT, created_at TEXT, updated_at TEXT,
  doc_type TEXT, title TEXT, content TEXT, reviewed INTEGER DEFAULT 0
);
`

export function initDb(): void {
  db.exec(SCHEMA)
  // 轻量迁移：为已存在的旧表补列（CREATE TABLE IF NOT EXISTS 不会改旧表）
  const contractCols = tableColumns('contract')
  if (!contractCols.includes('bid_id')) {
    db.exec('ALTER TABLE contract ADD COLUMN bid_id TEXT')
  }
  // 功能清单锚点：需求/方案/任务 关联功能
  for (const t of ['requirement', 'solution', 'task'] as const) {
    const cols = tableColumns(t)
    if (!cols.includes('feature_id')) {
      db.exec(`ALTER TABLE ${t} ADD COLUMN feature_id TEXT`)
    }
  }
}

/** 读取表的所有列名（动态校验用） */
function tableColumns(table: string): string[] {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  return rows.map((r) => r.name)
}

/** camelCase → snake_case */
function toDbKey(key: string): string {
  return key.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase())
}

/** snake_case → camelCase */
function toApiKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

/** 记录转换：camelCase 入参 → 数据库列名 */
function toDbRecord(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input)) out[toDbKey(k)] = v
  return out
}

/** 记录转换：数据库行 → camelCase 出参 */
function toApiRecord(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) out[toApiKey(k)] = v
  return out
}

export function getById(table: string, id: string): Record<string, unknown> | null {
  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined
  return row ? toApiRecord(row) : null
}

/** 列表查询，支持按 projectId 过滤（多项目隔离） */
export function listRows(table: string, projectId?: string): Record<string, unknown>[] {
  const cols = tableColumns(table)
  if (!cols.length) return []
  const hasProject = cols.includes('project_id')
  if (projectId && hasProject) {
    return (
      db.prepare(`SELECT * FROM ${table} WHERE project_id = ?`).all(projectId) as Record<
        string,
        unknown
      >[]
    ).map(toApiRecord)
  }
  return (db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[]).map(
    toApiRecord
  )
}

/** 插入记录（自动填充 id/created_at/updated_at，列名动态校验） */
export function insertRow(table: string, input: Record<string, unknown>): Record<string, unknown> {
  const cols = tableColumns(table)
  const rec = toDbRecord(input)
  const now = new Date().toISOString()
  const data: Record<string, unknown> = {
    id: (input.id as string) || crypto.randomUUID(),
    created_at: now,
    updated_at: now,
    ...rec
  }
  const keys = Object.keys(data).filter((k) => cols.includes(k))
  const placeholders = keys.map(() => '?').join(', ')
  const values = keys.map((k) => {
    const v = data[k]
    if (typeof v === 'boolean') return v ? 1 : 0
    return v === undefined ? null : v
  })
  db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`).run(...values)
  return getById(table, data.id as string)!
}

/** 更新记录（列名动态校验，自动更新 updated_at） */
export function updateRow(
  table: string,
  id: string,
  input: Record<string, unknown>
): Record<string, unknown> | null {
  const cols = tableColumns(table)
  const rec = toDbRecord(input)
  const data = { ...rec, updated_at: new Date().toISOString() }
  const keys = Object.keys(data).filter((k) => cols.includes(k) && k !== 'id')
  if (!keys.length) return getById(table, id)
  const sets = keys.map((k) => `${k} = ?`).join(', ')
  const values = keys.map((k) => {
    const v = data[k]
    if (typeof v === 'boolean') return v ? 1 : 0
    return v === undefined ? null : v
  })
  db.prepare(`UPDATE ${table} SET ${sets} WHERE id = ?`).run(...values, id)
  return getById(table, id)
}

export function deleteRow(table: string, id: string): boolean {
  const res = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id)
  return (res as unknown as { changes: number }).changes > 0
}

/** 级联删除：删除项目及其全部业务数据（含 project_id 列的业务表） */
export function deleteRowsByProject(projectId: string): Record<string, number> {
  const affected: Record<string, number> = {}
  for (const entity of Object.keys(ENTITY_TABLES)) {
    const table = ENTITY_TABLES[entity]
    if (table === 'project' || table === 'ontology_class' || table === 'ontology_property' || table === 'ontology_relation') {
      continue // 本体全局共享；project 单独删
    }
    const cols = tableColumns(table)
    if (!cols.includes('project_id')) continue
    const res = db.prepare(`DELETE FROM ${table} WHERE project_id = ?`).run(projectId)
    affected[table] = (res as unknown as { changes: number }).changes
  }
  const p = db.prepare(`DELETE FROM project WHERE id = ?`).run(projectId)
  affected.project = (p as unknown as { changes: number }).changes
  return affected
}

initDb()
