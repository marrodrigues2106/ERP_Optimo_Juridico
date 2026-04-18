migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('legal_cases')

    collection.listRule =
      "(@request.auth.role = 'admin' || @request.auth.isAdmin = true) || (responsible_collaborator.user = @request.auth.id)"
    collection.viewRule =
      "(@request.auth.role = 'admin' || @request.auth.isAdmin = true) || (responsible_collaborator.user = @request.auth.id)"

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('legal_cases')

    collection.listRule =
      "(@request.auth.id != '') && organization = @request.auth.active_organization && (@request.auth.role = 'admin' || @request.auth.isAdmin = true || responsible_collaborator.user = @request.auth.id || responsible_collaborator = '')"
    collection.viewRule =
      "(@request.auth.id != '') && organization = @request.auth.active_organization && (@request.auth.role = 'admin' || @request.auth.isAdmin = true || responsible_collaborator.user = @request.auth.id || responsible_collaborator = '')"

    app.save(collection)
  },
)
