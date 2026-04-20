migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('monitoring_configs')
    if (!col.fields.getByName('jota')) {
      col.fields.add(new TextField({ name: 'jota', max: 255 }))
    }
    if (!col.fields.getByName('som')) {
      col.fields.add(new BoolField({ name: 'som' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('monitoring_configs')
    col.fields.removeByName('jota')
    col.fields.removeByName('som')
    app.save(col)
  },
)
