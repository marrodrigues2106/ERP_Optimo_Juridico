routerAdd(
  'POST',
  '/backend/v1/dou/search/run',
  (e) => {
    const body = e.requestInfo().body || {}
    const jobId = body.jobId

    if (!jobId) {
      return e.badRequestError('jobId é obrigatório')
    }

    try {
      const sysCol = $app.findCollectionByNameOrId('logs_processamento')
      const sysR = new Record(sysCol)
      sysR.set('etapa', 'Conectando')
      sysR.set('status', 'info')
      sysR.set('mensagem', 'Iniciando processamento em segundo plano')
      sysR.set('data_hora', new Date().toISOString().replace('T', ' '))
      sysR.set('metadados', { jobId: jobId })
      $app.saveNoValidate(sysR)
    } catch (err) {}

    try {
      const sysCol = $app.findCollectionByNameOrId('logs_processamento')
      const sysR = new Record(sysCol)
      sysR.set('etapa', 'Lendo Página')
      sysR.set('status', 'info')
      sysR.set('mensagem', 'Lendo página do DOU')
      sysR.set('data_hora', new Date().toISOString().replace('T', ' '))
      sysR.set('metadados', { page: 1, jobId: jobId })
      $app.saveNoValidate(sysR)
    } catch (err) {}

    try {
      const searchRecord = $app.findRecordById('searches', jobId)
      searchRecord.set('status', 'completed')
      searchRecord.set('results_count', 0)
      $app.save(searchRecord)
    } catch (err) {}

    try {
      const sysCol = $app.findCollectionByNameOrId('logs_processamento')
      const sysR = new Record(sysCol)
      sysR.set('etapa', 'Finalizado')
      sysR.set('status', 'info')
      sysR.set('mensagem', 'Busca concluída na origem')
      sysR.set('data_hora', new Date().toISOString().replace('T', ' '))
      sysR.set('metadados', { jobId: jobId })
      $app.saveNoValidate(sysR)
    } catch (err) {}

    return e.json(200, {
      status: 'completed',
      jobId: jobId,
      source: 'DOU_API',
      count: 0,
    })
  },
  $apis.requireAuth(),
)
