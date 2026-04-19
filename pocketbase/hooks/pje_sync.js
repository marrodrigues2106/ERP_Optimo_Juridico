routerAdd(
  'POST',
  '/backend/v1/processos/{caseId}/sync-pje',
  (e) => {
    const caseId = e.request.pathValue('caseId')
    let record
    try {
      record = $app.findRecordById('legal_cases', caseId)
    } catch (err) {
      throw new NotFoundError('Case not found')
    }

    if (record.getString('pje_sync_status') === 'syncing') {
      return e.json(200, { success: true, message: 'Processo já está em sincronização.' })
    }

    record.set('pje_sync_status', 'pending')
    $app.saveNoValidate(record)

    return e.json(200, { success: true, message: 'Sincronização agendada com sucesso.' })
  },
  $apis.requireAuth(),
)
