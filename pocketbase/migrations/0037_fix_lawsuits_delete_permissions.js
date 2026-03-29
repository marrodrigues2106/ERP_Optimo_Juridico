migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('lawsuits')

    // Ensure the delete rule is robust enough to allow deletion by authenticated users
    collection.deleteRule = "@request.auth.id != ''"

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('lawsuits')

    collection.deleteRule = "@request.auth.id != ''"

    app.save(collection)
  },
)
