onRecordCreateRequest(
  (e) => {
    e.next()
    try {
      const userId = e.auth?.id || null
      const logs = $app.findCollectionByNameOrId('audit_logs')
      const logRecord = new Record(logs)
      logRecord.set('collection_name', e.collection.name)
      logRecord.set('record_id', e.record.id)
      logRecord.set('action', 'create')
      logRecord.set('user', userId)
      logRecord.set('changes', e.requestInfo().body)
      $app.saveNoValidate(logRecord)
    } catch (err) {
      console.log('Audit log err:', err)
    }
  },
  'lawsuits',
  'clients',
  'finances',
)

onRecordUpdateRequest(
  (e) => {
    e.next()
    try {
      const userId = e.auth?.id || null
      const logs = $app.findCollectionByNameOrId('audit_logs')
      const logRecord = new Record(logs)
      logRecord.set('collection_name', e.collection.name)
      logRecord.set('record_id', e.record.id)
      logRecord.set('action', 'update')
      logRecord.set('user', userId)
      logRecord.set('changes', e.requestInfo().body)
      $app.saveNoValidate(logRecord)
    } catch (err) {
      console.log('Audit log err:', err)
    }
  },
  'lawsuits',
  'clients',
  'finances',
  'monitoring_configs',
)

onRecordDeleteRequest(
  (e) => {
    try {
      const userId = e.auth?.id || null
      const logs = $app.findCollectionByNameOrId('audit_logs')
      const logRecord = new Record(logs)
      logRecord.set('collection_name', e.collection.name)
      logRecord.set('record_id', e.record.id)
      logRecord.set('action', 'delete')
      logRecord.set('user', userId)
      $app.saveNoValidate(logRecord)
    } catch (err) {
      console.log('Audit log err:', err)
    }
    e.next()
  },
  'lawsuits',
  'clients',
  'finances',
  'monitoring_configs',
)
