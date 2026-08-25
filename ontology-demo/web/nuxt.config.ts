export default defineNuxtConfig({
  ssr: false,
  modules: ['@pinia/nuxt', '@element-plus/nuxt'],
  css: [],
  devtools: { enabled: false },
  compatibilityDate: '2025-07-15',
  app: {
    head: {
      title: 'Ontology Web · 项目实施全链路风险管控',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1.0' }]
    }
  },
  nitro: {
    // SQLite 数据文件位于 server/data/ontology.db
  }
})
