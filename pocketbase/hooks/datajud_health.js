routerAdd('GET', '/backend/v1/datajud/health', (e) => {
  try {
    const alias = e.request.url.query().get('alias') || 'stf'
    const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
    const cfg = configs.length > 0 ? configs[0] : null

    if (!cfg || !cfg.get('apiKey')) {
      const errStr = 'Configuration Missing: API Key is not set'
      if (cfg) {
        cfg.set('lastError', errStr)
        try {
          $app.saveNoValidate(cfg)
        } catch (e) {}
      }
      return e.json(200, {
        status: 'error',
        detail: errStr,
        errorType: 'Configuration Missing',
      })
    }
    const apiKey = cfg.get('apiKey')

    try {
      const tr = $app.findFirstRecordByFilter('tribunals', `alias = '${alias}'`)
      if (!tr.get('active')) {
        return e.json(200, {
          status: 'error',
          detail: `Invalid Endpoint: Tribunal '${alias}' inactive`,
          errorType: 'Invalid Endpoint',
        })
      }
    } catch (err) {
      return e.json(200, {
        status: 'error',
        detail: `Invalid Endpoint: Tribunal alias not recognized`,
        errorType: 'Invalid Endpoint',
      })
    }

    const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`
    let res
    const start = Date.now()
    let lastErrorString = ''

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
        timeout: 30, // Updated timeout
      })

      if (res.statusCode === 401 || res.statusCode === 403) {
        lastErrorString = 'Authentication Error: Invalid or expired API Key'
      } else if (res.statusCode === 404) {
        lastErrorString = 'Invalid Endpoint: Tribunal alias not recognized'
      } else if (res.statusCode >= 300) {
        lastErrorString = 'HTTP Error: ' + res.statusCode
      }
    } catch (err) {
      const errStr = String(err).toLowerCase()
      if (errStr.includes('no such host') || errStr.includes('dns') || errStr.includes('resolve')) {
        lastErrorString = 'DNS Failure: Could not resolve host'
      } else if (errStr.includes('timeout') || errStr.includes('deadline')) {
        lastErrorString = 'Connection Timeout: Server took too long to respond'
      } else {
        lastErrorString = 'Network Failure: ' + String(err)
      }
    }

    const latency = Date.now() - start

    try {
      cfg.set('lastStatus', res ? res.statusCode : 0)
      cfg.set('lastLatency', latency)
      cfg.set('lastError', lastErrorString)
      $app.saveNoValidate(cfg)
    } catch (e) {}

    if (lastErrorString) {
      return e.json(200, {
        status: 'error',
        detail: lastErrorString,
        errorType: lastErrorString,
        latency,
      })
    }

    return e.json(200, { status: 'online', latency, data: res.json })
  } catch (err) {
    return e.json(500, { error: String(err) })
  }
})
