routerAdd(
  'POST',
  '/backend/v1/datajud/batch-sync',
  (e) => {
    const body = e.requestInfo().body || {}
    const ids = body.ids || []
    if (!ids.length) return e.badRequestError('Nenhum processo selecionado')

    const orgId = e.auth?.get('active_organization')
    if (!orgId) return e.badRequestError('Organização não encontrada')

    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const log = new Record(logsCol)
      log.set('level', 'info')
      log.set('module', 'datajud_batch_sync')
      log.set('message', `Iniciando sincronização em lote de ${ids.length} processos.`)
      log.set('organization', orgId)
      log.set('user', e.auth?.id)
      $app.saveNoValidate(log)
    } catch (err) {
      console.log('Error logging batch sync start', err)
    }

    let count = 0
    for (const id of ids) {
      try {
        const record = $app.findRecordById('legal_cases', id)

        // Validate organization and type
        if (record.get('organization') !== orgId) continue
        if (record.get('type') === 'Serviço Jurídico') continue

        record.set('datajud_sync_status', 'Pending')
        $app.saveNoValidate(record)
        count++
      } catch (err) {
        console.log(`Failed to queue case ${id}`, err)
      }
    }

    return e.json(200, { success: true, count })
  },
  $apis.requireAuth(),
)
