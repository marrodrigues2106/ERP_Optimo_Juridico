migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pje_communications')
    col.fields.add(new BoolField({ name: 'is_saved' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pje_communications')
    col.fields.removeByName('is_saved')
    app.save(col)
  },
)
