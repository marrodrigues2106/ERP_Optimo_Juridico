migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    const clientField = col.fields.getByName('client')
    if (clientField) {
      clientField.maxSelect = 2147483647 // Allow multiple clients per case
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    const clientField = col.fields.getByName('client')
    if (clientField) {
      clientField.maxSelect = 1 // Revert to single client
      app.save(col)
    }
  },
)
