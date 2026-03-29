migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('lawsuits')

    // Ensure robust deleteRule is in place
    collection.deleteRule = "@request.auth.id != ''"

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('lawsuits')
    collection.deleteRule = "@request.auth.id != ''"
    app.save(collection)
  },
)
