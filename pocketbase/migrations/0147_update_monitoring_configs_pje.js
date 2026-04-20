migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('monitoring_configs')

    if (!col.fields.getByName('pje_status')) {
      col.fields.add(
        new SelectField({ name: 'pje_status', maxSelect: 1, values: ['online', 'offline'] }),
      )
    }
    if (!col.fields.getByName('pje_connection_status')) {
      col.fields.add(
        new SelectField({
          name: 'pje_connection_status',
          maxSelect: 1,
          values: ['connected', 'disconnected'],
        }),
      )
    }

    try {
      col.fields.removeByName('jota_credentials')
    } catch (_) {}
    try {
      col.fields.removeByName('ingov_credentials')
    } catch (_) {}
    try {
      col.fields.removeByName('status_tribunais')
    } catch (_) {}

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('monitoring_configs')
    col.fields.removeByName('pje_status')
    col.fields.removeByName('pje_connection_status')
    app.save(col)
  },
)
