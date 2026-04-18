routerAdd(
  'POST',
  '/backend/v1/pje_comunica_proxy',
  (e) => {
    const query = e.requestInfo().query || {}
    const body = e.requestInfo().body || {}

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

    const queryParams = []
    allowedParams.forEach((p) => {
      let val = query[p]
      if (val) {
        if (p === 'dataDisponibilizacaoInicio' || p === 'dataDisponibilizacaoFim') {
          if (val.indexOf('T') !== -1) {
            val = val.split('T')[0]
          } else {
            val = val.substring(0, 10)
          }
        }
        queryParams.push(encodeURIComponent(p) + '=' + encodeURIComponent(val))
      }
    })

    let apiKey = body.apiKey
    if (!apiKey) {
      try {
        const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
        if (configs && configs.length > 0) {
          apiKey = configs[0].getString('pje_api_key')
        }
      } catch (_) {}
    }
    if (!apiKey) apiKey = $secrets.get('COMUNICA_PJE_KEY')

    if (!apiKey) {
      return e.internalServerError('COMUNICA_PJE_KEY not configured')
    }

    let baseUrl = body.baseUrl || 'https://comunicaapi.pje.jus.br/api/v1/comunicacao'
    if (!body.baseUrl) {
      try {
        const setting = $app.findFirstRecordByData('settings', 'key', 'pje_comunica_base_url')
        if (setting && setting.getString('value')) {
          baseUrl = setting.getString('value')
        }
      } catch (_) {}
    }

    if (!baseUrl.includes('/comunicacao')) {
      if (baseUrl.endsWith('/')) {
        baseUrl += 'comunicacao'
      } else {
        baseUrl += '/comunicacao'
      }
    }

    const queryString = queryParams.join('&')
    const sep = baseUrl.indexOf('?') !== -1 ? '&' : '?'
    const url = queryString ? `${baseUrl}${sep}${queryString}` : baseUrl

    let origin = 'https://comunicaapi.pje.jus.br'
    try {
      const parts = baseUrl.split('/')
      if (parts.length >= 3) {
        origin = parts[0] + '//' + parts[2]
      }
    } catch (_) {}

    const headers = {
      Authorization: 'Bearer ' + apiKey,
      Accept: 'application/json, text/plain, */*',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      Origin: origin,
      Referer: origin + '/',
      'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    }

    if (body.wafBypass) {
      headers['Cache-Control'] = 'no-cache'
      headers['Pragma'] = 'no-cache'
    }

    const res = $http.send({
      url: url,
      method: 'GET',
      headers: headers,
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
    } else if (res.statusCode === 400) {
      status = 'bad_request'
      message = res.json && res.json.message ? res.json.message : 'Parâmetros de busca inválidos'
    } else if (res.statusCode === 401) {
      status = 'error'
      message = 'Token de acesso inválido ou expirado (401)'
    } else if (res.statusCode === 403) {
      status = 'geoblocked'
      const rawRes = res.raw || ''
      if (res.json && res.json.message) {
        message = 'Acesso Negado (403): ' + res.json.message
      } else {
        message =
          'Bloqueio Geográfico ou Acesso Negado pelo WAF (403). Verifique se o IP do servidor ou a sua API Key estão autorizados no portal do PJe.'
      }
      console.log('PJe 403 Error:', rawRes)
    } else if (res.statusCode === 429) {
      status = 'rate_limit'
      message = 'Limite de requisições excedido (429)'
    } else {
      status = 'error'
      message =
        res.json && res.json.message ? res.json.message : 'Erro na API externa: ' + res.statusCode
    }

    let searchRecord
    try {
      const historyCol = $app.findCollectionByNameOrId('pje_search_history')
      searchRecord = new Record(historyCol)
      searchRecord.set('consulta', query)
      searchRecord.set('termo', JSON.stringify(query))
      searchRecord.set('tipo_busca', 'PJe Comunica')

      let mappedStatus = 'sucesso'
      if (status === 'no_results') mappedStatus = 'sem_resultados'
      else if (status === 'bad_request') mappedStatus = 'erro_validacao'
      else if (status === 'error') mappedStatus = 'erro'
      else if (status === 'geoblocked') mappedStatus = 'bloqueio_geografico'
      else if (status === 'rate_limit') mappedStatus = 'erro_rede'

      searchRecord.set('business_status', mappedStatus)
      searchRecord.set('status', mappedStatus)
      searchRecord.set('quantidade_resultados', resultsCount)
      searchRecord.set('mensagem', message)
      searchRecord.set('data_inicio', query.dataDisponibilizacaoInicio || '')
      searchRecord.set('data_fim', query.dataDisponibilizacaoFim || '')

      if (e.auth) {
        searchRecord.set('organization', e.auth.getString('active_organization'))
      }

      $app.save(searchRecord)
    } catch (err) {
      console.log('Error saving pje_search_history record: ', err)
    }

    const enhancedItems = []

    if (searchRecord && items.length > 0) {
      const resultsCol = $app.findCollectionByNameOrId('pje_search_results')
      const limit = Math.min(items.length, 50)
      for (let i = 0; i < limit; i++) {
        const item = items[i]
        try {
          const r = new Record(resultsCol)
          r.set('search_history', searchRecord.id)
          r.set('sigla_tribunal', item.siglaTribunal || '')
          r.set('tipo_comunicacao', item.tipoComunicacao || '')
          r.set('nome_orgao', item.nomeOrgao || '')
          r.set('texto', item.texto || '')
          r.set('numero_processo', item.numeroProcesso || item.numero_processo || '')
          r.set('meio', item.meio || '')
          r.set('tipo_documento', item.tipoDocumento || '')
          r.set('nome_classe', item.nomeClasse || '')
          r.set('data_disponibilizacao', item.dataDisponibilizacao || '')
          r.set('numero_comunicacao', item.numeroComunicacao || item.numero_comunicacao || '')
          r.set('link', item.link || '')
          r.set(
            'hash_comunicacao',
            item.hash || item.hashComunicacao || item.hash_comunicacao || '',
          )
          r.set('status_comunicacao', item.statusComunicacao || item.status_comunicacao || '')

          if (item.destinatarios && item.destinatarios.length > 0) {
            r.set('advogado_nome', item.destinatarios[0].nome || '')
            r.set('advogado_numero_oab', item.destinatarios[0].numeroOab || '')
            r.set('advogado_uf_oab', item.destinatarios[0].ufOab || '')
          }

          r.set('raw_json', item)

          if (e.auth) {
            r.set('organization', e.auth.getString('active_organization'))
          }

          $app.save(r)

          enhancedItems.push(Object.assign({}, item, { _db_id: r.id }))
        } catch (err) {
          console.log('Error saving pje_search_results record: ', err)
          enhancedItems.push(item)
        }
      }
    } else {
      for (let i = 0; i < items.length; i++) {
        enhancedItems.push(items[i])
      }
    }

    if (res.statusCode !== 200) {
      return e.json(res.statusCode, { message: message, details: res.json })
    }

    const responsePayload = Object.assign({}, res.json, { items: enhancedItems })
    return e.json(200, responsePayload)
  },
  $apis.requireAuth(),
)
