import { listRows } from '~/server/utils/db'

/** GET /api/ontology —— 返回完整本体模型（类/属性/关系） */
export default defineEventHandler(() => {
  return {
    classes: listRows('ontology_class'),
    properties: listRows('ontology_property'),
    relations: listRows('ontology_relation')
  }
})
