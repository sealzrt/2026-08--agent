/**
 * 本体数据模型定义
 *
 * 本工具的本体由三类元素组成：
 *  - Class（类）：业务概念，如 合同、项目、风险
 *  - Property（数据属性）：类的字段，如 合同的验收条款
 *  - Relation（对象关系）：类与类之间的关系，如 合同--约束-->项目
 *
 * 内部以 SQLite 表存储，预留 OWL 导出能力。
 */

/** 业务阶段：售前 / 实施 / 运维质保 / 通用 */
export type Phase = 'presales' | 'implementation' | 'ops' | 'common'

/** 属性值类型 */
export type PropertyType = 'string' | 'text' | 'number' | 'date' | 'boolean' | 'enum'

/** 关系基数 */
export type Cardinality = '1-1' | '1-n' | 'n-1' | 'n-m'

/** 本体类 */
export interface OntologyClass {
  id: string
  /** 中文名 */
  name: string
  /** 英文标识 */
  code: string
  description: string
  phase: Phase
  /** 父类 id（支持继承） */
  parentId?: string
}

/** 数据属性（挂在类下） */
export interface OntologyProperty {
  id: string
  classId: string
  name: string
  code: string
  type: PropertyType
  required: boolean
  description: string
  /** type=enum 时的可选值 */
  enumValues?: string[]
}

/** 对象关系（类与类） */
export interface OntologyRelation {
  id: string
  name: string
  code: string
  fromClassId: string
  toClassId: string
  description: string
  cardinality: Cardinality
}

/** 完整本体模型（版本化，支持演进） */
export interface OntologyModel {
  version: string
  name: string
  classes: OntologyClass[]
  properties: OntologyProperty[]
  relations: OntologyRelation[]
  updatedAt: string
}
