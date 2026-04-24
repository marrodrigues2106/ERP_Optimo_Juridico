migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('case_movements')
    if (!col.fields.getByName('external_link')) {
      col.fields.add(new URLField({ name: 'external_link', required: false }))
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('case_movements')
    const field = col.fields.getByName('external_link')
    if (field) {
      col.fields.removeById(field.id)
      app.save(col)
    }
  },
)
