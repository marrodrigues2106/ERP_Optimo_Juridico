migrate(
  (app) => {
    try {
      const records = app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
      if (records.length === 0) {
        const col = app.findCollectionByNameOrId('monitoring_configs')
        const record = new Record(col)
        record.set('apiKey', 'DEFAULT_KEY_OR_EMPTY')
        record.set('frequency', 'Daily')
        record.set('sync_processos', true)
        record.set('termos_busca', JSON.stringify([]))
        record.set('tribunais', JSON.stringify([]))
        app.save(record)
      }
    } catch (e) {}
  },
  (app) => {},
)
