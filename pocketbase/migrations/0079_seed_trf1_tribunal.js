migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('tribunals')

    try {
      const existing = app.findFirstRecordByData('tribunals', 'alias', 'trf1')
      existing.set('active', true)
      app.save(existing)
    } catch (_) {
      const record = new Record(collection)
      record.set('name', 'TRF1')
      record.set('alias', 'trf1')
      record.set('active', true)
      app.save(record)
    }
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData('tribunals', 'alias', 'trf1')
      record.set('active', false)
      app.save(record)
    } catch (_) {}
  },
)
