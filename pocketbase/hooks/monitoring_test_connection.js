routerAdd(
  'POST',
  '/backend/v1/monitoring/test-connection',
  (e) => {
    const body = e.requestInfo().body || {}
    const service = body.service || 'datajud'
    const alias = body.alias || 'stf'

    const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
    const cfg = configs.length > 0 ? configs[0] : null

    if (!cfg || !cfg.get('apiKey')) {
      return e.json(200, {
        service,
        status: 0,
        latency: 0,
        snippet: 'ERRO: Authentication Error - API Key missing',
        errorType: 'Authentication Error',
      })
    }
    const apiKey = cfg.get('apiKey')

    if (service === 'datajud') {
      try {
        const tr = $app.findFirstRecordByFilter('tribunals', `alias = '${alias}'`)
        if (!tr.get('active')) {
          return e.json(200, {
            service,
            status: 0,
            latency: 0,
            snippet: `ERRO: Invalid Endpoint/Alias - Tribunal '${alias}' inactive`,
            errorType: 'Invalid Endpoint/Alias',
          })
        }
      } catch (err) {
        return e.json(200, {
          service,
          status: 0,
          latency: 0,
          snippet: `ERRO: Invalid Endpoint/Alias - Tribunal '${alias}' not found`,
          errorType: 'Invalid Endpoint/Alias',
        })
      }

      const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`
      let res
      let lastErrorString = ''
      const start = Date.now()

      try {
        try {
          $http.send({ url: 'https://1.1.1.1', method: 'GET', timeout: 2 })
        } catch (err) {}

        res = $http.send({
          url: url,
          method: 'POST',
          headers: {
            Authorization: 'APIKey ' + apiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ size: 1, query: { match_all: {} } }),
          timeout: 10,
        })

        if (res.statusCode === 401 || res.statusCode === 403) {
          lastErrorString = 'Authentication Error'
        } else if (res.statusCode === 404) {
          lastErrorString = 'Invalid Endpoint/Alias'
        } else if (res.statusCode >= 300) {
          lastErrorString = 'HTTP ' + res.statusCode
        }
      } catch (err) {
        const errStr = String(err).toLowerCase()
        if (
          errStr.includes('no such host') ||
          errStr.includes('dns') ||
          errStr.includes('resolve')
        ) {
          lastErrorString = 'DNS Failure'
        } else {
          lastErrorString = 'Connection Timeout/Network Failure'
        }
      }

      const latency = Date.now() - start
      const statusCode = res ? res.statusCode : 0
      let snippet = ''

      if (lastErrorString) {
        snippet = `ERRO: ${lastErrorString}.\n\n`
        if (res && res.body) snippet += String(res.body).substring(0, 150)
      } else {
        snippet = `SUCESSO: Conexão com DATAJUD estabelecida.\n\n`
        if (res && res.body) snippet += String(res.body).substring(0, 150) + '...'
      }

      try {
        cfg.set('lastStatus', statusCode)
        cfg.set('lastLatency', latency)
        cfg.set('lastError', lastErrorString)
        $app.saveNoValidate(cfg)
      } catch (e) {}

      return e.json(200, {
        service,
        status: statusCode,
        latency,
        snippet,
        errorType: lastErrorString,
      })
    }

    const start = Date.now()
    let res
    try {
      res = $http.send({
        url: 'https://httpbin.org/get',
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeout: 10,
      })
    } catch (err) {
      return e.json(500, {
        service,
        status: 0,
        latency: Date.now() - start,
        snippet: 'Connection Timeout/Network Failure: ' + String(err),
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

    try {
      if (cfg) {
        if (service === 'tribunal') {
          cfg.set('tribunalStatus', res.statusCode)
          cfg.set('tribunalLatency', latency)
        } else if (service === 'dou') {
          cfg.set('douStatus', res.statusCode)
          cfg.set('douLatency', latency)
        }
        $app.saveNoValidate(cfg)
      }
    } catch (err) {}

    return e.json(200, { service, status: res.statusCode, latency, snippet })
  },
  $apis.requireAuth(),
)
