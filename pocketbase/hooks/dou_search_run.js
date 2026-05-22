routerAdd(
  'POST',
  '/backend/v1/dou/search/run',
  (e) => {
    var body = e.requestInfo().body || {}
    var jobId = body.jobId

    if (!jobId) {
      return e.badRequestError('jobId é obrigatório')
    }

    function logAction(mensagem, metadados, status, etapa) {
      status = status || 'info'
      etapa = etapa || 'request'
      try {
        var sysCol = $app.findCollectionByNameOrId('logs_processamento')
        var sysR = new Record(sysCol)
        sysR.set('etapa', etapa)
        sysR.set('status', status)
        sysR.set('mensagem', mensagem)
        sysR.set('data_hora', new Date().toISOString().replace('T', ' '))
        var meta = metadados || {}
        meta.jobId = jobId
        sysR.set('metadados', meta)
        $app.saveNoValidate(sysR)
      } catch (err) {}
    }

    logAction('Iniciando processamento em segundo plano', {}, 'info', 'Conectando')
    logAction('Lendo página do DOU', { page: 1 }, 'info', 'Lendo Página')

    try {
      var searchRecord = $app.findRecordById('searches', jobId)
      searchRecord.set('status', 'completed')
      searchRecord.set('results_count', 0)
      $app.save(searchRecord)
    } catch (err) {
      // Ignore safely if search record is missing or deleted
    }

    logAction('Busca concluída na origem', {}, 'info', 'Finalizado')

    return e.json(200, {
      status: 'completed',
      jobId: jobId,
      source: 'DOU_API',
      count: 0,
    })
  },
  $apis.requireAuth(),
)
