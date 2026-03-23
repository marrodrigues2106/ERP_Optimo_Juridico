routerAdd('GET', '/backend/v1/datajud/health', (e) => {
  try {
    const alias = e.request.url.query().get('alias') || 'stf'
    const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
    const cfg = configs.length > 0 ? configs[0] : null

    let errorType = ''
    let lastErrorString = ''

    if (!cfg || !cfg.get('apiKey')) {
      errorType = 'API_KEY_MISSING'
      lastErrorString = 'Configuration Missing: API Key is not set'
      if (cfg) {
        cfg.set('datajudLastError', lastErrorString)
        cfg.set('datajudStatus', errorType)
        cfg.set('datajudLastCheckAt', new Date().toISOString())
        try {
          $app.saveNoValidate(cfg)
        } catch (e) {}
      }
      return e.json(200, {
        status: 'error',
        detail: lastErrorString,
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
        } catch (e) {}

        return e.json(200, {
          status: 'error',
          detail: lastErrorString,
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
        status: 'error',
        detail: lastErrorString,
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

    try {
      cfg.set('lastStatus', res ? res.statusCode : 0)
      cfg.set('lastLatency', latency)
      cfg.set('datajudStatus', errorType)
      cfg.set('datajudLastError', lastErrorString)
      cfg.set('datajudLastCheckAt', new Date().toISOString())
      $app.saveNoValidate(cfg)
    } catch (e) {}

    if (lastErrorString) {
      return e.json(200, {
        status: 'error',
        detail: lastErrorString,
        errorType: errorType,
        latency,
      })
    }

    return e.json(200, { status: 'online', latency, data: res.json, errorType: 'online' })
  } catch (err) {
    return e.json(500, { error: String(err) })
  }
})
