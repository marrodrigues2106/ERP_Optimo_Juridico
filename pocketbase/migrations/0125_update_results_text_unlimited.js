migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('results')
    const field = col.fields.getByName('texto')
    if (field) {
      field.max = null
      col.fields.add(field)
    } else {
      col.fields.add(new TextField({ name: 'texto', max: null }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('results')
    const field = col.fields.getByName('texto')
    if (field) {
      field.max = 5000
      col.fields.add(field)
      app.save(col)
    }
  },
)
