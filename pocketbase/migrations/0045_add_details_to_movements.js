migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('case_movements')
    if (!col.fields.getByName('details')) {
      col.fields.add(new TextField({ name: 'details' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('case_movements')
    col.fields.removeByName('details')
    app.save(col)
  },
)
