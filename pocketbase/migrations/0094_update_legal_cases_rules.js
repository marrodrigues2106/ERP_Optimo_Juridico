migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    const newRule =
      "(@request.auth.id != '') && organization = @request.auth.active_organization && (@request.auth.role = 'admin' || @request.auth.isAdmin = true || responsible_collaborator.user = @request.auth.id || responsible_collaborator = '')"
    col.listRule = newRule
    col.viewRule = newRule
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    const oldRule = "(@request.auth.id != '') && organization = @request.auth.active_organization"
    col.listRule = oldRule
    col.viewRule = oldRule
    app.save(col)
  },
)
