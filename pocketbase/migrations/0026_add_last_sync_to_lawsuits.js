migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('lawsuits')
    if (!collection.fields.getByName('last_sync')) {
      collection.fields.add(new DateField({ name: 'last_sync' }))
    }
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('lawsuits')
    collection.fields.removeByName('last_sync')
    app.save(collection)
  },
)
