migrate(
  (app) => {
    try {
      app.db().newQuery('DELETE FROM publicacoes_dou').execute()
    } catch (_) {}

    try {
      app.db().newQuery('DELETE FROM dou_search_cache').execute()
    } catch (_) {}
  },
  (app) => {
    // No down migration required for data truncation
  },
)
