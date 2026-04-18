migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pje_search_results')
    collection.createRule =
      "(@request.auth.id != '') && organization = @request.auth.active_organization"
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pje_search_results')
    collection.createRule = null
    app.save(collection)
  },
)
