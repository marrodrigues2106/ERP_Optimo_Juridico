routerAdd(
  'POST',
  '/backend/v1/dou/search',
  (e) => {
    const body = e.requestInfo().body || {}
    const q = (body.q || '').trim()
    const publishFrom = body.publishFrom || ''
    const publishTo = body.publishTo || ''
    const secao = body.secao || 'todos'
    const searchMode = body.searchMode || 'exact'

    const user = e.auth
    if (!user) return e.unauthorizedError('Não autorizado')

    const isAdmin = user.getString('role') === 'admin' || user.getBool('isAdmin')
    const canView = user.getBool('can_view_search_module')
    if (!isAdmin && !canView) {
      return e.forbiddenError('Sem permissão para acessar o módulo de busca.')
    }

    if (!q) {
      return e.badRequestError("Parâmetro 'q' é obrigatório.")
    }
    if (!publishFrom || !publishTo) {
      return e.badRequestError("Os parâmetros 'publishFrom' e 'publishTo' são obrigatórios.")
    }

    const dFrom = new Date(publishFrom)
    const dTo = new Date(publishTo)
    const diffTime = Math.abs(dTo.getTime() - dFrom.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays > 30) {
      return e.badRequestError('O período de busca não pode ser superior a 30 dias.')
    }

    let searchRecord = null
    try {
      if ($app.hasTable('searches')) {
        const searchesCol = $app.findCollectionByNameOrId('searches')
        searchRecord = new Record(searchesCol)
        searchRecord.set('term', q)
        searchRecord.set('search_type', 'Livre')
        searchRecord.set('status', 'running')
        searchRecord.set('results_count', 0)
        searchRecord.set('start_date', publishFrom)
        searchRecord.set('end_date', publishTo)
        $app.save(searchRecord)
      }
    } catch (err) {
      $app.logger().error('Erro ao criar registro em searches', 'error', err.toString())
    }

    const jobId = searchRecord ? searchRecord.id : 'job_' + $security.randomString(8)
    $app.logger().info('Iniciando busca DOU', 'q', q, 'publishFrom', publishFrom, 'jobId', jobId)

    const cacheItems = []
    try {
      if ($app.hasTable('publicacoes_dou')) {
        const orgId = user.getString('active_organization') || ''
        const terms = q
          .split(' OR ')
          .map((t) => {
            let cleanT = t.trim()
            if (searchMode === 'exact') {
              cleanT = cleanT.replace(/^"|"$/g, '')
            }
            return cleanT
          })
          .filter(Boolean)

        const qEscaped = q.replace(/'/g, "''").replace(/^"|"$/g, '')
        const termsFilters =
          terms.length > 0
            ? terms
                .map((t) => {
                  const safeT = t.replace(/'/g, "''")
                  return `(texto_normalizado ~ '${safeT}' || titulo ~ '${safeT}')`
                })
                .join(' || ')
            : `(texto_normalizado ~ '${qEscaped}' || titulo ~ '${qEscaped}')`

        let filter = `data_publicacao >= '${publishFrom} 00:00:00.000Z' && data_publicacao <= '${publishTo} 23:59:59.999Z' && (${termsFilters})`

        if (orgId) {
          filter += ` && organization = '${orgId}'`
        }

        if (secao && secao !== 'todos') {
          filter += ` && secao = '${secao.toUpperCase()}'`
        }

        const localRecords = $app.findRecordsByFilter(
          'publicacoes_dou',
          filter,
          '-data_publicacao',
          100,
          0,
        )

        for (const rec of localRecords) {
          cacheItems.push({
            id: rec.id,
            titulo: rec.getString('titulo'),
            secao: rec.getString('secao'),
            orgao: rec.getString('orgao'),
            texto_normalizado: rec.getString('texto_normalizado'),
            url_origem: rec.getString('url_origem'),
            data_publicacao: rec.getString('data_publicacao'),
            fonte_coleta: 'LOCAL_DB',
            editionNumber: rec.getString('editionNumber'),
            numberPage: rec.getString('numberPage'),
            hierarchyStr: rec.getString('hierarchyStr'),
            artType: rec.getString('artType'),
            hash_conteudo: rec.getString('hash_conteudo'),
          })
        }
      }
    } catch (err) {
      $app.logger().error('Erro ao buscar cache local', 'error', err.toString(), 'jobId', jobId)
    }

    return e.json(200, {
      status: 'started',
      jobId: jobId,
      localItems: cacheItems,
    })
  },
  $apis.requireAuth(),
)
