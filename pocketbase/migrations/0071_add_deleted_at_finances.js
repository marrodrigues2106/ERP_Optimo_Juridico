migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('finances')
    if (!collection.fields.getByName('deleted_at')) {
      collection.fields.add(new DateField({ name: 'deleted_at' }))
      app.save(collection)
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('finances')
    if (collection.fields.getByName('deleted_at')) {
      collection.fields.removeByName('deleted_at')
      app.save(collection)
    }
  },
)
