migrate((app) => {
  const col = app.findCollectionByNameOrId('monitoring_configs')
  let changed = false

  if (!col.fields.getByName('pje_status')) {
    col.fields.add(new SelectField({ name: 'pje_status', values: ['online', 'offline'] }))
    changed = true
  }
  if (!col.fields.getByName('pje_connection_status')) {
    col.fields.add(
      new SelectField({ name: 'pje_connection_status', values: ['connected', 'disconnected'] }),
    )
    changed = true
  }
  if (!col.fields.getByName('datajudStatus')) {
    col.fields.add(new TextField({ name: 'datajudStatus' }))
    changed = true
  }

  if (changed) {
    app.save(col)
  }
})
