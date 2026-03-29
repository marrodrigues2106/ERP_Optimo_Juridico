migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    if (!col.fields.getByName('tags')) {
      col.fields.add(new JSONField({ name: 'tags' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    col.fields.removeByName('tags')
    app.save(col)
  },
)
