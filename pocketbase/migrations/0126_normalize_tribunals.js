migrate(
  (app) => {
    const tribunals = app.findRecordsByFilter('tribunals', '1=1', '', 0, 0)
    const seen = {}

    for (const t of tribunals) {
      const alias = t.getString('alias').toUpperCase()
      if (seen[alias]) {
        app.delete(t)
      } else {
        t.set('alias', alias)
        app.save(t)
        seen[alias] = true
      }
    }
  },
  (app) => {
    // Revert not feasible automatically due to deleted records
  },
)
