routerAdd('GET', '/backend/v1/datajud/health', (e) => {
  try {
    const alias = e.request.url.query().get('alias') || 'stf'
    const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
    const cfg = configs.length > 0 ? configs[0] : null

    if (!cfg || !cfg.get('apiKey')) {
      return e.json(200, {
        status: 'error',
        detail: 'Authentication Error: API Key missing',
        errorType: 'Authentication Error',
      })
    }
    const apiKey = cfg.get('apiKey')

    try {
      const tr = $app.findFirstRecordByFilter('tribunals', `alias = '${alias}'`)
      if (!tr.get('active')) {
        return e.json(200, {
          status: 'error',
          detail: `Invalid Endpoint/Alias: Tribunal '${alias}' inactive`,
          errorType: 'Invalid Endpoint/Alias',
        })
      }
    } catch (err) {
      return e.json(200, {
        status: 'error',
        detail: `Invalid Endpoint/Alias: Tribunal '${alias}' not found`,
        errorType: 'Invalid Endpoint/Alias',
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
        timeout: 10,
      })

      if (res.statusCode === 401 || res.statusCode === 403) lastErrorString = 'Authentication Error'
      else if (res.statusCode === 404) lastErrorString = 'Invalid Endpoint/Alias'
      else if (res.statusCode >= 300) lastErrorString = 'HTTP ' + res.statusCode
    } catch (err) {
      const errStr = String(err).toLowerCase()
      if (errStr.includes('no such host') || errStr.includes('dns') || errStr.includes('resolve')) {
        lastErrorString = 'DNS Failure'
      } else {
        lastErrorString = 'Connection Timeout/Network Failure'
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
