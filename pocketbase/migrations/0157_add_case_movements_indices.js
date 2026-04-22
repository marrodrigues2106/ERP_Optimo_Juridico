migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('case_movements')
    col.addIndex('idx_case_movements_case_date', false, 'case, event_date', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('case_movements')
    col.removeIndex('idx_case_movements_case_date')
    app.save(col)
  },
)
