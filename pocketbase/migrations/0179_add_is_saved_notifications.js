migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('notifications')
    if (!col.fields.getByName('is_saved')) {
      col.fields.add(new BoolField({ name: 'is_saved' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('notifications')
    if (col.fields.getByName('is_saved')) {
      col.fields.removeByName('is_saved')
      app.save(col)
    }
  },
)
