migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('monitoring_configs')

    if (col.fields.getByName('som')) {
      col.fields.removeByName('som')
    }

    if (col.fields.getByName('tribunais')) {
      col.fields.removeByName('tribunais')
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('monitoring_configs')

    if (!col.fields.getByName('som')) {
      col.fields.add(new BoolField({ name: 'som' }))
    }

    if (!col.fields.getByName('tribunais')) {
      col.fields.add(new JSONField({ name: 'tribunais' }))
    }

    app.save(col)
  },
)
