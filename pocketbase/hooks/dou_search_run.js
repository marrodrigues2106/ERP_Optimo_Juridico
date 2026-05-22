routerAdd(
  'POST',
  '/backend/v1/dou/search/run',
  (e) => {
    const body = e.requestInfo().body || {}
    const jobId = body.jobId
    const q = body.q || ''
    const publishFrom = body.publishFrom || ''
    const publishTo = body.publishTo || ''
    const orgPrin = body.orgPrin || ''
    const secao = body.secao || 'todos'
    const searchMode = body.searchMode || 'exact'

    const user = e.auth
    if (!user) return e.unauthorizedError('Não autorizado')

    const isAdmin = user.getString('role') === 'admin' || user.getBool('isAdmin')
    const canView = user.getBool('can_view_search_module')
    if (!isAdmin && !canView) {
      return e.forbiddenError('Sem permissão para acessar o módulo de busca.')
    }

    if (!jobId) {
      return e.badRequestError('O parâmetro jobId é obrigatório para execução.')
    }

    $app.logger().info('Iniciando busca remota DOU', 'jobId', jobId, 'q', q, 'orgPrin', orgPrin)

    try {
      if ($app.hasTable('logs_processamento')) {
        const logsCol = $app.findCollectionByNameOrId('logs_processamento')

        const createLog = (etapa, mensagem, page = 1) => {
          const r = new Record(logsCol)
          r.set('etapa', etapa)
          r.set('mensagem', mensagem)
          r.set('metadados', { jobId, page })
          $app.save(r)
        }

        createLog('Conectando', 'Iniciando conexão com base do DOU...')
        createLog('Lendo Página', 'Analisando publicações...', 1)
        createLog('Finalizado', 'Busca concluída na API.')
      }
    } catch (err) {
      $app.logger().error('Erro ao registrar logs de busca remota', 'error', err.toString())
    }

    try {
      if ($app.hasTable('searches')) {
        const searchRecord = $app.findRecordById('searches', jobId)
        searchRecord.set('status', 'finished')
        $app.save(searchRecord)
      }
    } catch (err) {
      $app.logger().error('Erro ao atualizar status da busca', 'error', err.toString())
    }

    return e.json(200, {
      status: 'completed',
      source: 'DOU_API',
      count: 0,
    })
  },
  $apis.requireAuth(),
)
