migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('settings')

    try {
      app.findFirstRecordByData('settings', 'key', 'resend_api_key')
    } catch (_) {
      const record1 = new Record(col)
      record1.set('key', 'resend_api_key')
      record1.set('value', '')
      app.save(record1)
    }

    try {
      app.findFirstRecordByData('settings', 'key', 'resend_from_email')
    } catch (_) {
      const record2 = new Record(col)
      record2.set('key', 'resend_from_email')
      record2.set('value', 'contato@moraesrodriguesadvocacia.com.br')
      app.save(record2)
    }
  },
  (app) => {
    try {
      const r1 = app.findFirstRecordByData('settings', 'key', 'resend_api_key')
      app.delete(r1)
    } catch (_) {}
    try {
      const r2 = app.findFirstRecordByData('settings', 'key', 'resend_from_email')
      app.delete(r2)
    } catch (_) {}
  },
)
