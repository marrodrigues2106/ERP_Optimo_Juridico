routerAdd(
  'POST',
  '/backend/v1/pje/sync/{id}',
  (e) => {
    const caseId = e.request.pathValue('id')
    let record
    try {
      record = $app.findRecordById('legal_cases', caseId)
    } catch (_) {
      throw new NotFoundError('Case not found')
    }

    const numeroProcesso = record.getString('case_number')
    if (!numeroProcesso) throw new BadRequestError('Case has no number')

    let apiKey = ''
    try {
      const setting = $app.findFirstRecordByData('settings', 'key', 'apiKey')
      apiKey = setting.getString('value')
    } catch (_) {}
    if (!apiKey && $secrets.has('COMUNICA_PJE_KEY')) apiKey = $secrets.get('COMUNICA_PJE_KEY')

    const url = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=${numeroProcesso.replace(/\D/g, '')}`
    const res = $http.send({
      url: url,
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      timeout: 30,
    })

    let processNewCount = 0
    if (res.statusCode === 200 && res.json) {
      const items = Array.isArray(res.json.items)
        ? res.json.items
        : Array.isArray(res.json)
          ? res.json
          : []
      const resultsCol = $app.findCollectionByNameOrId('results')

      const searchesCol = $app.findCollectionByNameOrId('searches')
      const searchRec = new Record(searchesCol)
      searchRec.set('term', `numeroProcesso:${numeroProcesso}`)
      searchRec.set('search_type', 'comunica_pje_case')
      searchRec.set('status', 'success')
      searchRec.set('business_status', 'completed')
      searchRec.set('results_count', items.length)
      searchRec.set('message', 'Single case sync')
      $app.save(searchRec)

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
          $app.save(r)
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
            m.set('external_id', hash)
            $app.save(m)
          } catch (e) {}
        }
      }
    }

    record.set('pje_last_sync', new Date().toISOString())
    record.set('pje_sync_status', 'success')
    $app.save(record)

    return e.json(200, { message: 'Sync completed', newCount: processNewCount })
  },
  $apis.requireAuth(),
)
