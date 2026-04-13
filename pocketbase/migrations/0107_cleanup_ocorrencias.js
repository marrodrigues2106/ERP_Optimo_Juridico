migrate(
  (app) => {
    // Database Sanitization: Complete removal of legacy mock data from the ocorrencias_dou collection.
    // The schema is preserved, but ghost records are permanently purged.
    app.db().newQuery('DELETE FROM ocorrencias_dou').execute()
  },
  (app) => {
    // Deletion is irreversible, down migration is a no-op
  },
)
