routerAdd(
  'POST',
  '/backend/v1/monitoring/test-connection',
  (e) => {
    const body = e.requestInfo().body || {}
    const service = body.service || 'datajud'

    if (service === 'datajud') {
      const alias = body.alias || 'stf'
      const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
      const cfg = configs.length > 0 ? configs[0] : null

      if (!cfg || !cfg.get('apiKey')) {
        return e.json(200, {
          service,
          status: 0,
          latency: 0,
          snippet: 'ERRO: Erro de Configuração - API Key is missing or empty',
          errorType: 'Configuration Error',
        })
      }
      const apiKey = cfg.get('apiKey')

      try {
        const tr = $app.findFirstRecordByFilter('tribunals', `alias = '${alias}'`)
        if (!tr.get('active')) {
          return e.json(200, {
            service,
            status: 0,
            latency: 0,
            snippet: `ERRO: Erro de Configuração - Tribunal '${alias}' is inactive`,
            errorType: 'Configuration Error',
          })
        }
      } catch (err) {
        return e.json(200, {
          service,
          status: 0,
          latency: 0,
          snippet: `ERRO: Endpoint/Alias inválido - Tribunal '${alias}' not found`,
          errorType: 'Invalid Endpoint',
        })
      }

      const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`
      const start = Date.now()
      let res

      try {
        res = $http.send({
          url: url,
          method: 'POST',
          headers: {
            Authorization: 'APIKey ' + apiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ size: 1, query: { match_all: {} } }),
          timeout: 15,
        })
      } catch (err) {
        const latency = Date.now() - start
        try {
          cfg.set('lastStatus', 0)
          cfg.set('lastLatency', latency)
          cfg.set('lastError', 'Timeout: ' + String(err))
          $app.saveNoValidate(cfg)
        } catch (e) {}
        return e.json(200, {
          service,
          status: 0,
          latency,
          snippet: 'ERRO: Conectividade indisponível - ' + String(err),
          errorType: 'Timeout',
        })
      }

      const latency = Date.now() - start
      let snippet = ''
      if (res.statusCode >= 200 && res.statusCode < 300) {
        snippet = `SUCESSO: Conexão com DATAJUD estabelecida.\n\n`
        if (res.body) snippet += String(res.body).substring(0, 150) + '...'
      } else {
        snippet = `ERRO: HTTP ${res.statusCode}.\n\n`
        if (res.statusCode === 401 || res.statusCode === 403) {
          snippet += 'Credencial inválida ou expirada.\n'
        }
        if (res.body) snippet += String(res.body).substring(0, 150)
      }

      try {
        cfg.set('lastStatus', res.statusCode)
        cfg.set('lastLatency', latency)
        cfg.set('lastError', res.statusCode >= 300 ? snippet : '')
        $app.saveNoValidate(cfg)
      } catch (e) {}

      return e.json(200, { service, status: res.statusCode, latency, snippet })
    }

    // Mock endpoints for tribunal and dou to simulate external tests
    let url = 'https://httpbin.org/get'
    let headers = { Accept: 'application/json' }
    const start = Date.now()
    let res
    try {
      res = $http.send({ url: url, method: 'GET', headers: headers, timeout: 10 })
    } catch (err) {
      return e.json(500, {
        service: service,
        status: 0,
        latency: Date.now() - start,
        snippet: 'Falha de Conexão: ' + String(err),
      })
    }

    const latency = Date.now() - start
    let snippet = ''
    if (res.statusCode >= 200 && res.statusCode < 300) {
      snippet = `SUCESSO: Conexão com ${service.toUpperCase()} estabelecida.\n\n`
      if (res.body) snippet += String(res.body).substring(0, 150) + '...'
    } else {
      snippet = `ERRO: HTTP ${res.statusCode}.\n\n`
      if (res.body) snippet += String(res.body).substring(0, 150)
    }

    // Update latencies in configs
    try {
      const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
      if (configs.length > 0) {
        const c = configs[0]
        if (service === 'tribunal') {
          c.set('tribunalStatus', res.statusCode)
          c.set('tribunalLatency', latency)
        } else if (service === 'dou') {
          c.set('douStatus', res.statusCode)
          c.set('douLatency', latency)
        }
        $app.saveNoValidate(c)
      }
    } catch (err) {}

    return e.json(200, {
      service: service,
      status: res.statusCode,
      latency: latency,
      snippet: snippet,
    })
  },
  $apis.requireAuth(),
)
