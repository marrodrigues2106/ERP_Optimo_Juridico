migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('legal_cases')
    collection.deleteRule =
      "(@request.auth.id != '') && organization = @request.auth.active_organization && lifecycle_status = 'Arquivado'"
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('legal_cases')
    collection.deleteRule =
      "(@request.auth.id != '') && organization = @request.auth.active_organization"
    app.save(collection)
  },
)
