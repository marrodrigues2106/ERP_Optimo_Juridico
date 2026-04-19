migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.createRule = "@request.auth.role = 'admin' || @request.auth.isAdmin = true"
    app.save(users)

    const finances = app.findCollectionByNameOrId('finances')
    const rule =
      "(@request.auth.id != '') && organization = @request.auth.active_organization && (@request.auth.role = 'admin' || @request.auth.role = 'financial_user' || @request.auth.isAdmin = true || linked_lawsuit.responsible_collaborator.user = @request.auth.id)"
    finances.listRule = rule
    finances.viewRule = rule
    app.save(finances)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.createRule = ''
    app.save(users)

    const finances = app.findCollectionByNameOrId('finances')
    const rule = "(@request.auth.id != '') && organization = @request.auth.active_organization"
    finances.listRule = rule
    finances.viewRule = rule
    app.save(finances)
  },
)
