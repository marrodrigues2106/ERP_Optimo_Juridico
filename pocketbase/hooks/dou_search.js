routerAdd(
  'POST',
  '/backend/v1/dou/search',
  (e) => {
    const body = e.requestInfo().body || {}
    const q = (body.q || '').trim()
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
    let jobId = 'unknown'

    try {
      const searchesCol = $app.findCollectionByNameOrId('searches')
      try {
        const safeQ = q.replace(/'/g, "''")
        searchRecord = $app.findFirstRecordByFilter(
          'searches',
          "term='" + safeQ + "' && status='running'",
        )
      } catch (err2) {
        searchRecord = new Record(searchesCol)
        searchRecord.set('term', q)
        searchRecord.set('search_type', 'Livre')
        searchRecord.set('status', 'running')
        searchRecord.set('results_count', 0)
        searchRecord.set('start_date', publishFrom)
        searchRecord.set('end_date', publishTo)
        $app.save(searchRecord)
      }
      jobId = searchRecord.id
    } catch (err) {
      try {
        const sysCol = $app.findCollectionByNameOrId('logs_processamento')
        const sysR = new Record(sysCol)
        sysR.set('etapa', 'request')
        sysR.set('status', 'error')
        sysR.set('mensagem', 'Erro ao criar registro em searches')
        sysR.set('data_hora', new Date().toISOString().replace('T', ' '))
        sysR.set('metadados', { error: err.toString() })
        $app.saveNoValidate(sysR)
      } catch (err3) {}
    }

    try {
      const sysCol = $app.findCollectionByNameOrId('logs_processamento')
      const sysR = new Record(sysCol)
      sysR.set('etapa', 'request')
      sysR.set('status', 'info')
      sysR.set('mensagem', 'Iniciando busca DOU')
      sysR.set('data_hora', new Date().toISOString().replace('T', ' '))
      sysR.set('metadados', {
        q: q,
        publishFrom: publishFrom,
        publishTo: publishTo,
        orgPrin: orgPrin,
        jobId: jobId,
      })
      $app.saveNoValidate(sysR)
    } catch (err) {}

    const cacheItems = []
    try {
      const orgId = user.getString('active_organization') || ''
      const termsRaw = q.split(' OR ')
      const terms = []
      for (let i = 0; i < termsRaw.length; i++) {
        let cleanT = termsRaw[i].trim()
        if (searchMode === 'exact') {
          cleanT = cleanT.replace(/^"|"$/g, '')
        }
        if (cleanT) {
          terms.push(cleanT)
        }
      }

      let termsFilters = ''
      if (terms.length > 0) {
        const parts = []
        for (let j = 0; j < terms.length; j++) {
          const safeT = terms[j].replace(/'/g, "''")
          parts.push("(texto_normalizado ~ '" + safeT + "' || titulo ~ '" + safeT + "')")
        }
        termsFilters = parts.join(' || ')
      } else {
        const singleSafe = q.replace(/'/g, "''").replace(/^"|"$/g, '')
        termsFilters = "(texto_normalizado ~ '" + singleSafe + "' || titulo ~ '" + singleSafe + "')"
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
      try {
        const sysCol = $app.findCollectionByNameOrId('logs_processamento')
        const sysR = new Record(sysCol)
        sysR.set('etapa', 'cache')
        sysR.set('status', 'error')
        sysR.set('mensagem', 'Erro ao buscar cache local')
        sysR.set('data_hora', new Date().toISOString().replace('T', ' '))
        sysR.set('metadados', { error: err.toString(), jobId: jobId })
        $app.saveNoValidate(sysR)
      } catch (err3) {}
    }

    return e.json(200, {
      status: 'started',
      jobId: jobId,
      localItems: cacheItems,
    })
  },
  $apis.requireAuth(),
)
