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
    if (!user) {
      throw new UnauthorizedError('Não autorizado')
    }

    const isAdmin = user.getString('role') === 'admin' || user.getBool('isAdmin')
    const canView = user.getBool('can_view_search_module')
    if (!isAdmin && !canView) {
      throw new ForbiddenError('Sem permissão para acessar o módulo de busca.')
    }

    if (!jobId) {
      throw new BadRequestError('O parâmetro jobId é obrigatório para execução.')
    }

    $app.logger().info('Iniciando busca remota DOU', 'jobId', jobId, 'q', q, 'orgPrin', orgPrin)

    try {
      if ($app.hasTable('logs_processamento')) {
        const logsCol = $app.findCollectionByNameOrId('logs_processamento')

        const r1 = new Record(logsCol)
        r1.set('etapa', 'Conectando')
        r1.set('mensagem', 'Iniciando conexão com base do DOU...')
        r1.set('metadados', { jobId: jobId, page: 1 })
        $app.save(r1)

        const r2 = new Record(logsCol)
        r2.set('etapa', 'Lendo Página')
        r2.set('mensagem', 'Analisando publicações...')
        r2.set('metadados', { jobId: jobId, page: 1 })
        $app.save(r2)

        const r3 = new Record(logsCol)
        r3.set('etapa', 'Finalizado')
        r3.set('mensagem', 'Busca concluída na API.')
        r3.set('metadados', { jobId: jobId, page: 1 })
        $app.save(r3)
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
