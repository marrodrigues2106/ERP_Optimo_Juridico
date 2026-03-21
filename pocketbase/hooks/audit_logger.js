function createAuditLog(e, action) {
  try {
    const userId = e.auth?.id || null
    const logs = $app.findCollectionByNameOrId('audit_logs')
    const logRecord = new Record(logs)
    logRecord.set('collection_name', e.collection.name)
    logRecord.set('record_id', e.record.id)
    logRecord.set('action', action)
    logRecord.set('user', userId)

    if (action !== 'delete') {
      logRecord.set('changes', e.requestInfo().body)
    }

    $app.saveNoValidate(logRecord)
  } catch (err) {
    console.log('Audit log err:', err)
  }
}

onRecordCreateRequest(
  (e) => {
    e.next()
    createAuditLog(e, 'create')
  },
  'lawsuits',
  'clients',
  'finances',
)

onRecordUpdateRequest(
  (e) => {
    e.next()
    createAuditLog(e, 'update')
  },
  'lawsuits',
  'clients',
  'finances',
)

onRecordDeleteRequest(
  (e) => {
    createAuditLog(e, 'delete')
    e.next()
  },
  'lawsuits',
  'clients',
  'finances',
)
