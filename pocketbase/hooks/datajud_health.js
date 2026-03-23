routerAdd('GET', '/backend/v1/datajud/health', (e) => {
  try {
    const alias = e.request.url.query().get('alias') || 'stf'

    const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
    const cfg = configs.length > 0 ? configs[0] : null

    if (!cfg || !cfg.get('apiKey')) {
      return e.json(200, {
        status: 'error',
        detail: 'Configuration Error: API Key is missing or empty',
        errorType: 'Configuration Error',
      })
    }
    const apiKey = cfg.get('apiKey')

    try {
      const tr = $app.findFirstRecordByFilter('tribunals', `alias = '${alias}'`)
      if (!tr.get('active')) {
        return e.json(200, {
          status: 'error',
          detail: `Configuration Error: Tribunal alias '${alias}' is inactive`,
          errorType: 'Configuration Error',
        })
      }
    } catch (err) {
      return e.json(200, {
        status: 'error',
        detail: `Invalid Endpoint: Tribunal alias '${alias}' not found in database`,
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
        status: 'error',
        detail: 'Timeout or network issue: ' + String(err),
        errorType: 'Timeout',
        latency,
      })
    }

    const latency = Date.now() - start
    let errorType = null
    let detail = null

    if (res.statusCode === 401 || res.statusCode === 403) {
      errorType = 'Auth Error'
      detail = 'Invalid or expired credentials'
    } else if (res.statusCode === 404) {
      errorType = 'Invalid Endpoint'
      detail = 'Endpoint/Alias invalid'
    } else if (res.statusCode >= 300) {
      errorType = 'Unexpected HTTP Response'
      detail = 'HTTP ' + res.statusCode
    }

    try {
      cfg.set('lastStatus', res.statusCode)
      cfg.set('lastLatency', latency)
      cfg.set('lastError', detail || '')
      $app.saveNoValidate(cfg)
    } catch (e) {}

    if (errorType) {
      try {
        const logs = $app.findCollectionByNameOrId('audit_logs')
        const logRecord = new Record(logs)
        logRecord.set('collection_name', 'system')
        logRecord.set('record_id', 'datajud_health_check')
        logRecord.set('action', 'datajud_error')
        logRecord.set('changes', { error_code: res.statusCode, detail: detail })
        $app.saveNoValidate(logRecord)
      } catch (logErr) {}

      return e.json(200, { status: 'error', detail, errorType, latency })
    }

    return e.json(200, { status: 'online', latency, data: res.json })
  } catch (err) {
    return e.json(200, {
      status: 'error',
      detail: err.message || 'Graceful health check failure',
      errorType: 'Unexpected Error',
    })
  }
})
