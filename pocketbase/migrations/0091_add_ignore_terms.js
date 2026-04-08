migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('termos_monitorados')
    if (!col.fields.getByName('termos_ignorados')) {
      col.fields.add(new TextField({ name: 'termos_ignorados' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('termos_monitorados')
    col.fields.removeByName('termos_ignorados')
    app.save(col)
  },
)
