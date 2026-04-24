migrate(
  (app) => {
    const casesCol = app.findCollectionByNameOrId('legal_cases')

    const clientField = casesCol.fields.getByName('client')
    if (clientField) {
      clientField.maxSelect = 999
    }

    const isFavField = casesCol.fields.getByName('is_favorite')
    if (isFavField) {
      casesCol.addIndex('idx_legal_cases_favorite', false, 'is_favorite', '')
    }

    app.save(casesCol)
  },
  (app) => {
    const casesCol = app.findCollectionByNameOrId('legal_cases')

    const clientField = casesCol.fields.getByName('client')
    if (clientField) {
      clientField.maxSelect = 1
    }

    casesCol.removeIndex('idx_legal_cases_favorite')

    app.save(casesCol)
  },
)
