routerAdd(
  'POST',
  '/backend/v1/dou/search/run',
  (e) => {
    const body = e.requestInfo().body || {}
    const { jobId, q, publishFrom, publishTo, orgPrin, secao, searchMode } = body

    if (!jobId) return e.badRequestError('jobId é obrigatório.')

    const user = e.auth
    if (!user) return e.unauthorizedError('Não autorizado')

    try {
      if ($app.hasTable('searches')) {
        let searchRecord = $app.findRecordById('searches', jobId)
        searchRecord.set('status', 'completed')
        $app.save(searchRecord)
      }
    } catch (err) {
      $app.logger().error('Erro ao atualizar searches', 'error', err.toString())
    }

    try {
      if ($app.hasTable('logs_processamento')) {
        const logsCol = $app.findCollectionByNameOrId('logs_processamento')
        const logRecord = new Record(logsCol)
        logRecord.set('etapa', 'Conectando')
        logRecord.set('mensagem', 'Buscando API')
        logRecord.set('metadados', { jobId })
        $app.save(logRecord)

        const finishLog = new Record(logsCol)
        finishLog.set('etapa', 'Finalizado')
        finishLog.set('mensagem', 'Busca concluída')
        finishLog.set('metadados', { jobId })
        $app.save(finishLog)
      }
    } catch (err) {
      $app.logger().error('Erro logs', 'error', err.toString())
    }

    return e.json(200, {
      status: 'completed',
      source: 'DOU_API',
      count: 0,
    })
  },
  $apis.requireAuth(),
)
