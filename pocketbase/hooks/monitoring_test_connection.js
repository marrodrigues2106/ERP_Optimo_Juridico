routerAdd(
  'POST',
  '/backend/v1/monitoring/test-connection',
  (e) => {
    const body = e.requestInfo().body || {}
    const service = body.service || 'datajud'
    const alias = body.alias || 'stf'

    const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
    const cfg = configs.length > 0 ? configs[0] : null

    if (!cfg) {
      return e.json(200, {
        service,
        status: 0,
        latency: 0,
        snippet: 'ERRO: Configuration Missing',
        errorType: 'API_KEY_MISSING',
      })
    }

    if (service === 'datajud') {
      let errorType = ''
      let lastErrorString = ''

      if (!cfg.get('apiKey')) {
        errorType = 'API_KEY_MISSING'
        lastErrorString = 'Configuration Missing: API Key is not set'
        cfg.set('datajudLastError', lastErrorString)
        cfg.set('datajudStatus', errorType)
        cfg.set('datajudLastCheckAt', new Date().toISOString())
        try {
          $app.saveNoValidate(cfg)
        } catch (err) {}
        return e.json(200, {
          service,
          status: 0,
          latency: 0,
          snippet: 'ERRO: ' + lastErrorString,
          errorType: errorType,
        })
      }
      const apiKey = cfg.get('apiKey')

      try {
        const tr = $app.findFirstRecordByFilter('tribunals', `alias = '${alias}'`)
        if (!tr.get('active')) {
          errorType = 'ENDPOINT_INVALID'
          lastErrorString = `Invalid Endpoint: Tribunal '${alias}' inactive`
          cfg.set('datajudLastError', lastErrorString)
          cfg.set('datajudStatus', errorType)
          cfg.set('datajudLastCheckAt', new Date().toISOString())
          try {
            $app.saveNoValidate(cfg)
          } catch (err) {}
          return e.json(200, {
            service,
            status: 0,
            latency: 0,
            snippet: `ERRO: ` + lastErrorString,
            errorType: errorType,
          })
        }
      } catch (err) {
        errorType = 'ENDPOINT_INVALID'
        lastErrorString = `Invalid Endpoint: Tribunal alias not recognized`
        cfg.set('datajudLastError', lastErrorString)
        cfg.set('datajudStatus', errorType)
        cfg.set('datajudLastCheckAt', new Date().toISOString())
        try {
          $app.saveNoValidate(cfg)
        } catch (e) {}
        return e.json(200, {
          service,
          status: 0,
          latency: 0,
          snippet: `ERRO: ` + lastErrorString,
          errorType: errorType,
        })
      }

      const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`
      let res
      const start = Date.now()

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
          timeout: 30,
        })

        if (res.statusCode === 401 || res.statusCode === 403) {
          errorType = 'AUTH_FAILURE'
          lastErrorString = 'Authentication Error: Invalid or expired API Key'
        } else if (res.statusCode === 404) {
          errorType = 'ENDPOINT_INVALID'
          lastErrorString = 'Invalid Endpoint: Tribunal alias not recognized'
        } else if (res.statusCode >= 300) {
          errorType = 'HTTP_STATUS_ERRORS'
          lastErrorString = 'HTTP Error: ' + res.statusCode
        } else {
          errorType = 'online'
        }
      } catch (err) {
        const errStr = String(err).toLowerCase()
        if (
          errStr.includes('lookup') ||
          errStr.includes('no such host') ||
          errStr.includes('dns') ||
          errStr.includes('resolve')
        ) {
          errorType = 'DNS_FAILURE'
          lastErrorString = 'DNS Failure: Could not resolve host api-publica.datajud.cnj.jus.br'
        } else if (errStr.includes('timeout') || errStr.includes('deadline')) {
          errorType = 'NETWORK_TIMEOUT'
          lastErrorString = 'Connection Timeout: Server took too long to respond (30s)'
        } else if (errStr.includes('connection refused')) {
          errorType = 'NETWORK_REFUSED'
          lastErrorString = 'Network Refused: Connection refused by the server'
        } else {
          errorType = 'NETWORK_FAILURE'
          lastErrorString = 'Network Failure: ' + String(err)
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
        cfg.set('datajudStatus', errorType)
        cfg.set('datajudLastError', lastErrorString)
        cfg.set('datajudLastCheckAt', new Date().toISOString())
        $app.saveNoValidate(cfg)
      } catch (e) {}

      return e.json(200, {
        service,
        status: statusCode,
        latency,
        snippet,
        errorType: errorType,
      })
    }

    const start = Date.now()
    let res
    try {
      res = $http.send({
        url: 'https://httpbin.org/get',
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeout: 30,
      })
    } catch (err) {
      const errStr = String(err).toLowerCase()
      let finalErr = 'Network Failure: ' + String(err)
      if (errStr.includes('timeout') || errStr.includes('deadline')) {
        finalErr = 'Connection Timeout: Server took too long to respond'
      }
      return e.json(500, {
        service,
        status: 0,
        latency: Date.now() - start,
        snippet: finalErr,
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
