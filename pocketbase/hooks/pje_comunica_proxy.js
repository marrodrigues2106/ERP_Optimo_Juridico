routerAdd(
  'GET',
  '/backend/v1/pje-comunica',
  (e) => {
    const query = e.requestInfo().query || {}

    const params = new URLSearchParams()
    const allowedParams = [
      'numeroOab',
      'ufOab',
      'nomeParte',
      'numeroProcesso',
      'dataDisponibilizacaoInicio',
      'dataDisponibilizacaoFim',
      'siglaTribunal',
      'nomeAdvogado',
      'meio',
      'cpfCnpj',
    ]

    allowedParams.forEach((p) => {
      if (query[p]) params.append(p, query[p])
    })

    const apiKey = $secrets.get('COMUNICA_PJE_KEY')
    if (!apiKey) {
      return e.internalServerError('COMUNICA_PJE_KEY not configured')
    }

    let baseUrl = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao'
    try {
      const setting = $app.findFirstRecordByData('settings', 'key', 'pje_comunica_base_url')
      if (setting && setting.getString('value')) {
        baseUrl = setting.getString('value')
      }
    } catch (_) {}

    const url = `${baseUrl}?${params.toString()}`

    const res = $http.send({
      url: url,
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        Accept: 'application/json',
      },
      timeout: 30,
    })

    let status = 'success'
    let message = ''
    let resultsCount = 0
    let items = []

    if (res.statusCode === 200) {
      const data = res.json || {}
      items = data.items || []
      resultsCount = items.length
      if (resultsCount === 0) status = 'no_results'
    } else if (res.statusCode === 403) {
      status = 'geoblocked'
      message = 'Bloqueio Geográfico ou Acesso Negado'
    } else if (res.statusCode === 429) {
      status = 'rate_limit'
      message = 'Limite de requisições excedido'
    } else {
      status = 'error'
      message = 'Erro na API externa: ' + res.statusCode
    }

    let searchRecord
    try {
      const searchesCol = $app.findCollectionByNameOrId('searches')
      searchRecord = new Record(searchesCol)
      searchRecord.set('term', JSON.stringify(query))
      searchRecord.set('search_type', 'PJe Comunica')
      searchRecord.set('status', status)
      searchRecord.set('business_status', status)
      searchRecord.set('results_count', resultsCount)
      searchRecord.set('message', message)
      searchRecord.set('start_date', query.dataDisponibilizacaoInicio || '')
      searchRecord.set('end_date', query.dataDisponibilizacaoFim || '')
      $app.save(searchRecord)
    } catch (err) {
      console.log('Error saving search record: ', err)
    }

    if (searchRecord && items.length > 0) {
      const resultsCol = $app.findCollectionByNameOrId('results')
      const limit = Math.min(items.length, 50)
      for (let i = 0; i < limit; i++) {
        const item = items[i]
        try {
          const r = new Record(resultsCol)
          r.set('search_id', searchRecord.id)
          r.set('sigla_tribunal', item.siglaTribunal || '')
          r.set('tipo_comunicacao', item.tipoComunicacao || '')
          r.set('nome_orgao', item.nomeOrgao || '')
          r.set('texto', item.texto || '')
          r.set('numero_processo', item.numeroProcesso || '')
          r.set('meio', item.meio || '')
          r.set('tipo_documento', item.tipoDocumento || '')
          r.set('nome_classe', item.nomeClasse || '')
          r.set('data_disponibilizacao', item.dataDisponibilizacao || '')
          r.set('numero_comunicacao', item.numeroComunicacao || '')
          r.set('link', item.link || '')
          r.set('hash_comunicacao', item.hash || '')
          r.set('raw_json', item)
          $app.save(r)
        } catch (err) {
          console.log('Error saving result record: ', err)
        }
      }
    }

    if (res.statusCode !== 200) {
      return e.json(res.statusCode, { message: message, details: res.json })
    }

    return e.json(200, res.json)
  },
  $apis.requireAuth(),
)
