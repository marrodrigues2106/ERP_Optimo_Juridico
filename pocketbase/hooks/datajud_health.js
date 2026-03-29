routerAdd('GET', '/backend/v1/datajud/health', (e) => {
  try {
    const alias = e.request.url.query().get('alias') || 'stj'
    const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
    const cfg = configs.length > 0 ? configs[0] : null

    const updateConfigStatus = (status, latency, errType, errStr) => {
      if (!cfg) return
      cfg.set('lastStatus', status)
      cfg.set('lastLatency', latency)
      cfg.set('datajudStatus', errType)
      cfg.set('datajudLastError', errStr)
      cfg.set('datajudLastCheckAt', new Date().toISOString())
      try {
        $app.saveNoValidate(cfg)
      } catch (err) {}
    }

    const apiKey = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='

    try {
      const tr = $app.findFirstRecordByFilter('tribunals', `alias = '${alias}'`)
      if (!tr.get('active')) {
        updateConfigStatus(
          0,
          0,
          'ENDPOINT_INVALID',
          `Invalid Endpoint: Tribunal '${alias}' inactive`,
        )
        return e.json(200, {
          status: 'error',
          message: `Invalid Endpoint: Tribunal '${alias}' inactive`,
          errorType: 'ENDPOINT_INVALID',
          latency: 0,
        })
      }
    } catch (err) {}

    const callDataJud = (targetAlias, key, bodyStr) => {
      const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${targetAlias}/_search`
      const start = Date.now()
      let result = {
        statusCode: 0,
        latency: 0,
        errorType: 'online',
        errorMessage: '',
        rawResponse: null,
      }

      try {
        const res = $http.send({
          url: url,
          method: 'POST',
          headers: {
            Authorization: 'APIKey ' + key,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: bodyStr,
          timeout: 30,
        })
        result.latency = Date.now() - start
        result.statusCode = res.statusCode
        try {
          result.rawResponse = res.json
        } catch (err) {}

        if (res.statusCode === 401 || res.statusCode === 403) {
          result.errorType = 'AUTH_FAILURE'
          result.errorMessage = 'Authentication Error: Invalid or expired API Key'
        } else if (res.statusCode === 404) {
          result.errorType = 'ENDPOINT_INVALID'
          result.errorMessage = 'Invalid Endpoint: Tribunal alias not recognized'
        } else if (res.statusCode >= 300) {
          result.errorType = 'HTTP_STATUS_ERRORS'
          result.errorMessage = 'HTTP Error: ' + res.statusCode
        }
      } catch (err) {
        result.latency = Date.now() - start
        result.errorType = 'NETWORK_FAILURE'
        result.errorMessage = 'NETWORK_FAILURE: ' + String(err)
      }
      return result
    }

    let apiResult = callDataJud(
      alias,
      apiKey,
      JSON.stringify({ size: 1, query: { match_all: {} } }),
    )

    if (apiResult.errorType === 'ENDPOINT_INVALID' || apiResult.errorType === 'NETWORK_FAILURE') {
      const fallbackAlias = alias === 'stj' ? 'tjrj' : 'stj'
      const fallbackResult = callDataJud(
        fallbackAlias,
        apiKey,
        JSON.stringify({ size: 1, query: { match_all: {} } }),
      )
      if (fallbackResult.errorType === 'online') {
        apiResult = fallbackResult
        apiResult.errorMessage = 'Fallback successful via ' + fallbackAlias
      }
    }

    updateConfigStatus(
      apiResult.statusCode,
      apiResult.latency,
      apiResult.errorType,
      apiResult.errorMessage,
    )

    if (apiResult.errorType !== 'online') {
      return e.json(200, {
        status: 'error',
        message: apiResult.errorMessage,
        errorType: apiResult.errorType,
        latency: apiResult.latency,
      })
    }

    return e.json(200, {
      status: 'online',
      latency: apiResult.latency,
      message: 'Connection successful',
      data: apiResult.rawResponse,
      errorType: 'online',
    })
  } catch (err) {
    return e.json(500, { error: String(err) })
  }
})
