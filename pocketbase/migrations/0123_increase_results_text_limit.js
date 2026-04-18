migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('results')
    col.fields.add(new TextField({ name: 'texto', max: 0 }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('results')
    col.fields.add(new TextField({ name: 'texto', max: 5000 }))
    app.save(col)
  },
)
