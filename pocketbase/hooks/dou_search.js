routerAdd(
  'POST',
  '/backend/v1/dou/search',
  (e) => {
    const body = e.requestInfo().body || {}
    let q = body.q || ''
    q = q.trim()
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

    if (!q) {
      throw new BadRequestError("Parâmetro 'q' é obrigatório.")
    }
    if (!publishFrom || !publishTo) {
      throw new BadRequestError("Os parâmetros 'publishFrom' e 'publishTo' são obrigatórios.")
    }

    const dFrom = new Date(publishFrom)
    const dTo = new Date(publishTo)
    const diffTime = Math.abs(dTo.getTime() - dFrom.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays > 30) {
      throw new BadRequestError('O período de busca não pode ser superior a 30 dias.')
    }

    let searchRecord = null
    let jobId = ''
    try {
      const searchesCol = $app.findCollectionByNameOrId('searches')
      searchRecord = new Record(searchesCol)
      searchRecord.set('term', q)
      searchRecord.set('search_type', 'Livre')
      searchRecord.set('status', 'running')
      searchRecord.set('results_count', 0)
      searchRecord.set('start_date', publishFrom)
      searchRecord.set('end_date', publishTo)
      $app.save(searchRecord)
      jobId = searchRecord.id
    } catch (err) {
      $app.logger().error('Erro ao criar registro em searches', 'error', err.toString())
      jobId = 'job_' + $security.randomString(8)
    }

    $app.logger().info('Iniciando busca DOU', 'q', q, 'publishFrom', publishFrom, 'jobId', jobId)

    const cacheItems = []
    try {
      const orgId = user.getString('active_organization') || ''
      const rawTerms = q.split(' OR ')
      const terms = []

      for (let i = 0; i < rawTerms.length; i++) {
        let cleanT = rawTerms[i].trim()
        if (searchMode === 'exact') {
          cleanT = cleanT.replace(new RegExp('^"|"$', 'g'), '')
        }
        if (cleanT) {
          terms.push(cleanT)
        }
      }

      const qEscaped = q.replace(/'/g, "''").replace(new RegExp('^"|"$', 'g'), '')
      let termsFilters = ''

      if (terms.length > 0) {
        const filterParts = []
        for (let j = 0; j < terms.length; j++) {
          const safeT = terms[j].replace(/'/g, "''")
          filterParts.push("(texto_normalizado ~ '" + safeT + "' || titulo ~ '" + safeT + "')")
        }
        termsFilters = filterParts.join(' || ')
      } else {
        termsFilters = "(texto_normalizado ~ '" + qEscaped + "' || titulo ~ '" + qEscaped + "')"
      }

      let filter =
        "data_publicacao >= '" +
        publishFrom +
        " 00:00:00.000Z' && data_publicacao <= '" +
        publishTo +
        " 23:59:59.999Z' && (" +
        termsFilters +
        ')'

      if (orgId) {
        filter += " && organization = '" + orgId + "'"
      }

      if (secao && secao !== 'todos') {
        filter += " && secao = '" + secao.toUpperCase() + "'"
      }

      if (orgPrin) {
        filter += " && orgao ~ '" + orgPrin.replace(/'/g, "''") + "'"
      }

      const localRecords = $app.findRecordsByFilter(
        'publicacoes_dou',
        filter,
        '-data_publicacao',
        100,
        0,
      )

      for (let k = 0; k < localRecords.length; k++) {
        const rec = localRecords[k]
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
