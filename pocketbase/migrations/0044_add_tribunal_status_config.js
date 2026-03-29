migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('monitoring_configs')
    if (!col.fields.getByName('datajud_tribunal_status')) {
      col.fields.add(new JSONField({ name: 'datajud_tribunal_status' }))
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('monitoring_configs')
    if (col.fields.getByName('datajud_tribunal_status')) {
      col.fields.removeByName('datajud_tribunal_status')
      app.save(col)
    }
  },
)
