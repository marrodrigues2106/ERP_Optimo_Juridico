migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('configuracoes_alerta')
    const field = col.fields.getByName('frequencia')
    field.selectValues = ['diario', 'semanal']
    app.save(col)

    app
      .db()
      .newQuery(
        `UPDATE configuracoes_alerta SET frequencia = 'diario' WHERE frequencia NOT IN ('diario', 'semanal')`,
      )
      .execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('configuracoes_alerta')
    const field = col.fields.getByName('frequencia')
    field.selectValues = ['diario', 'imediato', 'hourly', 'daily', 'weekly']
    app.save(col)
  },
)
