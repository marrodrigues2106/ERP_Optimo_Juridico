migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('lawsuits')
    if (!col.fields.getByName('sync_message')) {
      col.fields.add(new TextField({ name: 'sync_message' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('lawsuits')
    if (col.fields.getByName('sync_message')) {
      col.fields.removeByName('sync_message')
    }
    app.save(col)
  },
)
