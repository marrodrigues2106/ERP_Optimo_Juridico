migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('case_movements')
    col.fields.add(new TextField({ name: 'details', max: 0 }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('case_movements')
    col.fields.add(new TextField({ name: 'details' }))
    app.save(col)
  },
)
