routerAdd(
  'POST',
  '/backend/v1/dou/search',
  (e) => {
    var body = e.requestInfo().body || {}
    var q = (body.q || '').trim()
    var publishFrom = body.publishFrom || ''
    var publishTo = body.publishTo || ''
    var orgPrin = body.orgPrin || ''
    var secao = body.secao || 'todos'
    var searchMode = body.searchMode || 'exact'

    var user = e.auth
    if (!user) {
      return e.unauthorizedError('Não autorizado')
    }
    var isAdmin = user.getString('role') === 'admin' || user.getBool('isAdmin')
    var canView = user.getBool('can_view_search_module')
    if (!isAdmin && !canView) {
      return e.forbiddenError('Sem permissão para acessar o módulo de busca.')
    }

    if (!q) {
      return e.badRequestError("Parâmetro 'q' é obrigatório.")
    }
    if (!publishFrom || !publishTo) {
      return e.badRequestError("Os parâmetros 'publishFrom' e 'publishTo' são obrigatórios.")
    }

    var dFrom = new Date(publishFrom)
    var dTo = new Date(publishTo)
    var diffTime = Math.abs(dTo.getTime() - dFrom.getTime())
    var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays > 30) {
      return e.badRequestError('O período de busca não pode ser superior a 30 dias.')
    }

    function logAction(mensagem, metadados, status, etapa, currentJobId) {
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
        if (currentJobId) {
          meta.jobId = currentJobId
        }
        sysR.set('metadados', meta)
        $app.saveNoValidate(sysR)
      } catch (err) {}
    }

    var searchRecord = null
    try {
      var searchesCol = $app.findCollectionByNameOrId('searches')
      try {
        var existing = $app.findFirstRecordByFilter(
          'searches',
          "term='" + q.replace(/'/g, "''") + "' && status='running'",
        )
        searchRecord = existing
      } catch (ignore) {
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
      logAction(
        'Erro ao criar registro em searches',
        { error: err.toString() },
        'error',
        'request',
        null,
      )
    }

    var jobId = searchRecord ? searchRecord.id : 'unknown'
    logAction(
      'Iniciando busca DOU',
      { q: q, publishFrom: publishFrom, publishTo: publishTo, orgPrin: orgPrin },
      'info',
      'request',
      jobId,
    )

    var cacheItems = []
    try {
      var orgId = user.getString('active_organization') || ''
      var termsRaw = q.split(' OR ')
      var terms = []
      for (var i = 0; i < termsRaw.length; i++) {
        var cleanT = termsRaw[i].trim()
        if (searchMode === 'exact') {
          cleanT = cleanT.replace(/^"|"$/g, '')
        }
        if (cleanT) {
          terms.push(cleanT)
        }
      }

      var termsFilters = ''
      if (terms.length > 0) {
        var parts = []
        for (var j = 0; j < terms.length; j++) {
          var safeT = terms[j].replace(/'/g, "''")
          parts.push("(texto_normalizado ~ '" + safeT + "' || titulo ~ '" + safeT + "')")
        }
        termsFilters = parts.join(' || ')
      } else {
        var singleSafe = q.replace(/'/g, "''").replace(/^"|"$/g, '')
        termsFilters = "(texto_normalizado ~ '" + singleSafe + "' || titulo ~ '" + singleSafe + "')"
      }

      var filter =
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

      var localRecords = $app.findRecordsByFilter(
        'publicacoes_dou',
        filter,
        '-data_publicacao',
        100,
      )

      for (var k = 0; k < localRecords.length; k++) {
        var rec = localRecords[k]
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
      logAction('Erro ao buscar cache local', { error: err.toString() }, 'error', 'cache', jobId)
    }

    return e.json(200, {
      status: 'started',
      jobId: jobId,
      localItems: cacheItems,
    })
  },
  $apis.requireAuth(),
)
