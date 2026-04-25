migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('tasks')
    if (!col.fields.getByName('is_all_day')) {
      col.fields.add(new BoolField({ name: 'is_all_day' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('tasks')
    col.fields.removeByName('is_all_day')
    app.save(col)
  },
)
