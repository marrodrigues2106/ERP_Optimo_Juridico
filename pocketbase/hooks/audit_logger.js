onRecordCreateRequest(
  (e) => {
    e.next()
    try {
      const userId = e.auth?.id || null
      const orgId = e.auth?.getString('active_organization') || null
      const logs = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logs)
      logRecord.set('level', 'info')
      logRecord.set('module', 'Audit')
      logRecord.set('message', `Criado registro em ${e.collection.name}`)
      logRecord.set('details', {
        record_id: e.record.id,
        collection: e.collection.name,
        action: 'create',
        changes: e.requestInfo().body,
      })
      if (userId) logRecord.set('user', userId)
      if (orgId) logRecord.set('organization', orgId)
      $app.saveNoValidate(logRecord)
    } catch (err) {
      console.log('Audit log err:', err)
    }
  },
  'legal_cases',
  'clients',
  'finances',
  'agenda_events',
)

onRecordUpdateRequest(
  (e) => {
    e.next()
    try {
      const userId = e.auth?.id || null
      const orgId = e.auth?.getString('active_organization') || null
      const logs = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logs)
      logRecord.set('level', 'info')
      logRecord.set('module', 'Audit')
      logRecord.set('message', `Atualizado registro em ${e.collection.name}`)
      logRecord.set('details', {
        record_id: e.record.id,
        collection: e.collection.name,
        action: 'update',
        changes: e.requestInfo().body,
      })
      if (userId) logRecord.set('user', userId)
      if (orgId) logRecord.set('organization', orgId)
      $app.saveNoValidate(logRecord)
    } catch (err) {
      console.log('Audit log err:', err)
    }
  },
  'legal_cases',
  'clients',
  'finances',
  'monitoring_configs',
  'agenda_events',
)

onRecordDeleteRequest(
  (e) => {
    try {
      const userId = e.auth?.id || null
      const orgId = e.auth?.getString('active_organization') || null
      const logs = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logs)
      logRecord.set('level', 'info')
      logRecord.set('module', 'Audit')
      logRecord.set('message', `Deletado registro de ${e.collection.name}`)
      logRecord.set('details', {
        record_id: e.record.id,
        collection: e.collection.name,
        action: 'delete',
      })
      if (userId) logRecord.set('user', userId)
      if (orgId) logRecord.set('organization', orgId)
      $app.saveNoValidate(logRecord)
    } catch (err) {
      console.log('Audit log err:', err)
    }
    e.next()
  },
  'legal_cases',
  'clients',
  'finances',
  'monitoring_configs',
  'agenda_events',
)
