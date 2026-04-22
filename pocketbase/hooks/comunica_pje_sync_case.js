routerAdd(
  'POST',
  '/backend/v1/pje/sync/{id}',
  (e) => {
    const caseId = e.request.pathValue('id')
    let record
    try {
      record = $app.findRecordById('legal_cases', caseId)
    } catch (_) {
      return e.notFoundError('Case not found')
    }

    const numeroProcesso = record.getString('case_number')
    if (!numeroProcesso) return e.badRequestError('Case has no number')

    record.set('pje_sync_status', 'syncing')
    try {
      $app.saveNoValidate(record)
    } catch (_) {}

    const startTime = Date.now()

    let apiKey = ''
    try {
      const setting = $app.findFirstRecordByData('settings', 'key', 'apiKey')
      apiKey = setting.getString('value')
    } catch (_) {}
    if (!apiKey && $secrets.has('COMUNICA_PJE_KEY')) apiKey = $secrets.get('COMUNICA_PJE_KEY')

    let baseUrl = 'https://comunicaapi.pje.jus.br/api/v1'
    try {
      const setting = $app.findFirstRecordByData('settings', 'key', 'baseUrl')
      if (setting.getString('value')) {
        baseUrl = setting.getString('value')
      }
    } catch (_) {}

    const url = `${baseUrl}/comunicacao?numeroProcesso=${numeroProcesso.replace(/\D/g, '')}`
    const res = $http.send({
      url: url,
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      timeout: 30,
    })

    let processNewCount = 0

    if (res.statusCode !== 200) {
      record.set('pje_last_sync', new Date().toISOString())
      record.set('pje_sync_status', 'error')
      try {
        $app.saveNoValidate(record)
      } catch (_) {}

      let errorMsg = `Erro na requisição: ${res.statusCode}`
      if (res.statusCode === 429) errorMsg = 'Rate limit excedido (429)'
      if (res.statusCode === 422) errorMsg = 'Parâmetros inválidos ou não encontrado (422)'
      if (res.statusCode === 404) errorMsg = 'Processo não encontrado no PJe (404)'
      if (res.statusCode === 401 || res.statusCode === 403)
        errorMsg = 'Erro de autenticação no PJe. Verifique a chave da API.'

      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('level', 'error')
        logRecord.set('module', 'comunica_pje_sync')
        logRecord.set('message', errorMsg)
        logRecord.set('details', {
          numero_processo: numeroProcesso,
          case_id: record.id,
          duration_ms: Date.now() - startTime,
          status: 'Error',
        })
        const orgId = record.getString('organization')
        if (orgId) logRecord.set('organization', orgId)
        $app.saveNoValidate(logRecord)
      } catch (_) {}

      return e.badRequestError(errorMsg)
    }

    if (res.statusCode === 200 && res.json) {
      const items = Array.isArray(res.json.items)
        ? res.json.items
        : Array.isArray(res.json)
          ? res.json
          : []
      const resultsCol = $app.findCollectionByNameOrId('results')
      const searchesCol = $app.findCollectionByNameOrId('searches')

      let searchRec = new Record(searchesCol)
      searchRec.set('term', `numeroProcesso:${numeroProcesso}`)
      searchRec.set('search_type', 'comunica_pje_case')
      searchRec.set('status', 'success')
      searchRec.set('business_status', 'completed')
      searchRec.set('results_count', items.length)
      searchRec.set('message', 'Single case sync')
      try {
        $app.saveNoValidate(searchRec)
      } catch (_) {}

      for (const item of items) {
        const hash = item.hash || item.numeroComunicacao || item.id
        if (!hash) continue
        try {
          $app.findFirstRecordByData('results', 'hash_comunicacao', hash)
        } catch (_) {
          const r = new Record(resultsCol)
          r.set('search_id', searchRec.id)
          r.set('legal_case', caseId)
          r.set('sigla_tribunal', item.siglaTribunal)
          r.set('tipo_comunicacao', item.tipoComunicacao)
          r.set('nome_orgao', item.nomeOrgao)
          r.set('texto', item.texto)
          r.set('numero_processo', item.numeroProcesso)
          r.set('meio', item.meio)
          r.set('tipo_documento', item.tipoDocumento)
          r.set('nome_classe', item.classe || item.nomeClasse)
          r.set('data_disponibilizacao', item.data_disponibilizacao || item.dataDisponibilizacao)
          r.set('numero_comunicacao', item.numeroComunicacao)
          r.set('link', item.link)
          r.set('hash_comunicacao', hash)
          r.set('status_comunicacao', item.status)
          r.set('raw_json', item)

          try {
            $app.saveNoValidate(r)
          } catch (err) {}
          processNewCount++

          try {
            const movementsCol = $app.findCollectionByNameOrId('case_movements')
            const m = new Record(movementsCol)
            m.set('case', caseId)
            m.set(
              'event_date',
              item.data_disponibilizacao || item.dataDisponibilizacao || new Date().toISOString(),
            )
            m.set('description', item.tipoComunicacao || 'Comunicação PJe')
            m.set('source', 'PJe')
            m.set('details', item.texto)
            m.set('external_id', 'pje_' + hash)
            const orgId = record.getString('organization')
            if (orgId) m.set('organization', orgId)

            m.set('movement_details', {
              texto: item.texto,
              orgaoJulgador: item.nomeOrgao,
              meio: item.meio,
              tipoDocumento: item.tipoDocumento,
              link: item.link,
            })

            $app.saveNoValidate(m)
          } catch (e) {}
        }
      }
    }

    record.set('pje_last_sync', new Date().toISOString())
    record.set('pje_sync_status', 'success')
    try {
      $app.saveNoValidate(record)
    } catch (_) {}

    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logsCol)
      logRecord.set('level', 'info')
      logRecord.set('module', 'comunica_pje_sync')
      logRecord.set(
        'message',
        `Sincronização PJe concluída. ${processNewCount} novas comunicações.`,
      )
      logRecord.set('details', {
        numero_processo: numeroProcesso,
        case_id: record.id,
        duration_ms: Date.now() - startTime,
        status: 'Success',
        added_movements: processNewCount,
      })
      const orgId = record.getString('organization')
      if (orgId) logRecord.set('organization', orgId)
      $app.saveNoValidate(logRecord)
    } catch (_) {}

    return e.json(200, {
      message: `Sincronização concluída. ${processNewCount} novas comunicações.`,
      newCount: processNewCount,
    })
  },
  $apis.requireAuth(),
)
