migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('results')
    const field = collection.fields.getByName('texto')

    if (field) {
      field.max = 0
      app.save(collection)
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('results')
    const field = collection.fields.getByName('texto')

    if (field) {
      field.max = 5000
      app.save(collection)
    }
  },
)
