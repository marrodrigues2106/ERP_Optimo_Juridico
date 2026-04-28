migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('termos_monitorados')

    const tipoField = col.fields.getByName('tipo_termo')
    if (tipoField) {
      tipoField.selectValues = ['Livre']
    }

    const searchMethodField = col.fields.getByName('search_method')
    if (searchMethodField) {
      searchMethodField.selectValues = ['Livre']
    }

    app.save(col)

    app
      .db()
      .newQuery("UPDATE termos_monitorados SET tipo_termo = 'Livre', search_method = 'Livre'")
      .execute()
  },
  (app) => {
    // Ignore downgrade
  },
)
