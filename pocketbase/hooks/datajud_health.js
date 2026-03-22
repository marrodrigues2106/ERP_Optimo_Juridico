routerAdd('GET', '/backend/v1/datajud/health', (e) => {
  try {
    let apiKey = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==' // Default fallback
    try {
      const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
      if (configs.length > 0 && configs[0].get('apiKey')) {
        apiKey = configs[0].get('apiKey')
      }
    } catch (err) {
      /* ignore */
    }

    const checkEndpoint = (url) => {
      return $http.send({
        url: url,
        method: 'POST',
        headers: {
          Authorization: 'APIKey ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ size: 1, query: { match_all: {} } }),
        timeout: 15,
      })
    }

    let res
    let usedFallback = false

    try {
      res = checkEndpoint('https://api-publica.datajud.cnj.jus.br/api_publica_stf/_search')
    } catch (err) {
      try {
        usedFallback = true
        res = checkEndpoint('https://api-publica.datajud.cnj.jus.br/api_publica_stj/_search')
      } catch (fallbackErr) {
        return e.json(200, { status: 'error', detail: 'All connection attempts failed' })
      }
    }

    if (res && (res.statusCode === 401 || res.statusCode === 403)) {
      try {
        const logs = $app.findCollectionByNameOrId('audit_logs')
        const logRecord = new Record(logs)
        logRecord.set('collection_name', 'system')
        logRecord.set('record_id', 'datajud_health_check')
        logRecord.set('action', 'datajud_auth_error')
        logRecord.set('changes', {
          error_code: res.statusCode,
          detail: 'DataJud API credentials may be invalid or expired.',
          fallback_used: usedFallback,
        })
        $app.saveNoValidate(logRecord)
      } catch (logErr) {
        console.log('Error logging audit auth failure:', logErr)
      }

      return e.json(200, { status: 'error', detail: 'Authentication failed: ' + res.statusCode })
    }

    if (res && res.statusCode === 200) {
      return e.json(200, { status: 'online', fallback: usedFallback })
    }

    return e.json(200, {
      status: 'error',
      detail: 'Unexpected HTTP status: ' + (res ? res.statusCode : 'unknown'),
    })
  } catch (err) {
    return e.json(200, { status: 'error', detail: err.message || 'Graceful health check failure' })
  }
})
