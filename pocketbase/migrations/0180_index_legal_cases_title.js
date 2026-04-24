migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    col.addIndex('idx_legal_cases_title_search', false, 'title', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    col.removeIndex('idx_legal_cases_title_search')
    app.save(col)
  },
)
