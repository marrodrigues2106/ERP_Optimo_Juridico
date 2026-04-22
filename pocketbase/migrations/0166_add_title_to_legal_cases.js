migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')

    if (!col.fields.getByName('title')) {
      col.fields.add(new TextField({ name: 'title' }))
    }

    col.addIndex('idx_legal_cases_title_search', false, 'title', '')

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')

    col.removeIndex('idx_legal_cases_title_search')

    if (col.fields.getByName('title')) {
      col.fields.removeByName('title')
    }

    app.save(col)
  },
)
