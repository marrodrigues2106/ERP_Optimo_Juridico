migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('configuracoes_alerta')
    const field = col.fields.getByName('frequencia')
    if (field) {
      field.values = ['diario', 'imediato', 'hourly', 'daily', 'weekly']
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('configuracoes_alerta')
    const field = col.fields.getByName('frequencia')
    if (field) {
      field.values = ['diario', 'imediato']
    }
    app.save(col)
  },
)
