migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    const field = col.fields.getByName('responsible_collaborator')
    if (field) {
      field.maxSelect = 2147483647
      col.fields.add(field)
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    const field = col.fields.getByName('responsible_collaborator')
    if (field) {
      field.maxSelect = 1
      col.fields.add(field)
      app.save(col)
    }
  },
)
