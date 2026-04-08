migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('configuracoes_alerta')
    const field = col.fields.getByName('tipo_notificacao')
    if (field) {
      field.values = ['app', 'email', 'slack', 'discord', 'all']
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('configuracoes_alerta')
    const field = col.fields.getByName('tipo_notificacao')
    if (field) {
      field.values = ['app', 'email']
    }
    app.save(col)
  },
)
