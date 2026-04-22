migrate(
  (app) => {
    const tables = [
      'notifications',
      'audit_logs',
      'system_logs',
      'ocorrencias_dou',
      'gazette_publications',
    ]

    for (const table of tables) {
      try {
        if (app.hasTable(table)) {
          app.db().newQuery(`DELETE FROM ${table}`).execute()
        }
      } catch (err) {
        console.log(`Error clearing ${table}:`, err)
      }
    }
  },
  (app) => {
    // Down migration is a no-op as we cannot restore deleted data
  },
)
