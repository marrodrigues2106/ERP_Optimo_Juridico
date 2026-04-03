migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('monitoring_configs')
    collection.fields.add(new JSONField({ name: 'termos_busca' }))
    collection.fields.add(new JSONField({ name: 'tribunais' }))
    collection.fields.add(new BoolField({ name: 'sync_processos' }))
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('monitoring_configs')
    collection.fields.removeByName('termos_busca')
    collection.fields.removeByName('tribunais')
    collection.fields.removeByName('sync_processos')
    app.save(collection)
  },
)
