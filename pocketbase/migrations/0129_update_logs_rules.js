migrate(
  (app) => {
    const audit = app.findCollectionByNameOrId('audit_logs')
    audit.listRule =
      "@request.auth.role = 'admin' || @request.auth.isAdmin = true || @request.auth.role = 'manager'"
    audit.viewRule =
      "@request.auth.role = 'admin' || @request.auth.isAdmin = true || @request.auth.role = 'manager'"
    app.save(audit)

    const processamento = app.findCollectionByNameOrId('logs_processamento')
    processamento.listRule =
      "@request.auth.role = 'admin' || @request.auth.isAdmin = true || @request.auth.role = 'manager'"
    processamento.viewRule =
      "@request.auth.role = 'admin' || @request.auth.isAdmin = true || @request.auth.role = 'manager'"
    app.save(processamento)
  },
  (app) => {
    const audit = app.findCollectionByNameOrId('audit_logs')
    audit.listRule = "@request.auth.role = 'admin' || @request.auth.isAdmin = true"
    audit.viewRule = "@request.auth.role = 'admin' || @request.auth.isAdmin = true"
    app.save(audit)

    const processamento = app.findCollectionByNameOrId('logs_processamento')
    processamento.listRule = "@request.auth.id != ''"
    processamento.viewRule = "@request.auth.id != ''"
    app.save(processamento)
  },
)
