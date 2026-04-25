migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('organizations')
    if (!col.fields.getByName('phone')) {
      col.fields.add(new TextField({ name: 'phone' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('organizations')
    if (col.fields.getByName('phone')) {
      col.fields.removeByName('phone')
    }
    app.save(col)
  },
)
