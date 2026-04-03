migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('audit_logs')
    col.listRule = "@request.auth.role = 'admin' || @request.auth.isAdmin = true"
    col.viewRule = "@request.auth.role = 'admin' || @request.auth.isAdmin = true"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('audit_logs')
    col.listRule = "@request.auth.role = 'admin' || @request.auth.isAdmin = true"
    col.viewRule = "@request.auth.role = 'admin' || @request.auth.isAdmin = true"
    app.save(col)
  },
)
