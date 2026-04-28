migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (!col.fields.getByName('can_view_search_module')) {
      col.fields.add(new BoolField({ name: 'can_view_search_module' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (col.fields.getByName('can_view_search_module')) {
      col.fields.removeByName('can_view_search_module')
    }
    app.save(col)
  },
)
