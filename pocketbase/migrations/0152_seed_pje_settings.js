migrate(
  (app) => {
    const settingsCol = app.findCollectionByNameOrId('settings')

    try {
      app.findFirstRecordByData('settings', 'key', 'baseUrl')
    } catch (_) {
      const record = new Record(settingsCol)
      record.set('key', 'baseUrl')
      record.set('value', 'https://comunicaapi.pje.jus.br/api/v1')
      app.save(record)
    }
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData('settings', 'key', 'baseUrl')
      app.delete(record)
    } catch (_) {}
  },
)
