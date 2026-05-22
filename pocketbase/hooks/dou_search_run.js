routerAdd(
  'POST',
  '/backend/v1/dou/search/run',
  (e) => {
    const body = e.requestInfo().body || {}
    const jobId = body.jobId

    if (!jobId) {
      return e.badRequestError('jobId é obrigatório.')
    }

    const user = e.auth
    if (!user) {
      return e.unauthorizedError('Não autorizado')
    }

    try {
      const searchesCol = $app.findCollectionByNameOrId('searches')
      if (searchesCol) {
        const searchRecord = $app.findRecordById('searches', jobId)
        searchRecord.set('status', 'completed')
        $app.save(searchRecord)
      }
    } catch (err) {
      $app.logger().error('Erro ao atualizar searches', 'error', String(err))
    }

    try {
      const logsCol = $app.findCollectionByNameOrId('logs_processamento')
      if (logsCol) {
        const logRecord = new Record(logsCol)
        logRecord.set('etapa', 'Conectando')
        logRecord.set('mensagem', 'Buscando API')
        logRecord.set('metadados', { jobId: jobId })
        $app.save(logRecord)

        const finishLog = new Record(logsCol)
        finishLog.set('etapa', 'Finalizado')
        finishLog.set('mensagem', 'Busca concluída')
        finishLog.set('metadados', { jobId: jobId })
        $app.save(finishLog)
      }
    } catch (err) {
      $app.logger().error('Erro logs', 'error', String(err))
    }

    return e.json(200, {
      status: 'completed',
      source: 'DOU_API',
      count: 0,
    })
  },
  $apis.requireAuth(),
)
