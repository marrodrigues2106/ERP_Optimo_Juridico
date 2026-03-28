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

    const apiKey = $secrets.get('DATAJUD_API_KEY')
    if (!apiKey) {
      updateConfigStatus(
        0,
        0,
        'API_KEY_MISSING',
        'Configuration Missing: DATAJUD_API_KEY secret is not set',
      )
      return e.json(200, {
        status: 'error',
        message: 'Configuration Missing: DATAJUD_API_KEY secret is not set',
        errorType: 'API_KEY_MISSING',
        latency: 0,
      })
    }

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
    } catch (err) {
      updateConfigStatus(
        0,
        0,
        'ENDPOINT_INVALID',
        `Invalid Endpoint: Tribunal alias not recognized`,
      )
      return e.json(200, {
        status: 'error',
        message: `Invalid Endpoint: Tribunal alias not recognized`,
        errorType: 'ENDPOINT_INVALID',
        latency: 0,
      })
    }

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
        } else {
          result.errorType = 'online'
        }
      } catch (err) {
        result.latency = Date.now() - start
        const errStr = String(err).toLowerCase()
        if (
          errStr.includes('lookup') ||
          errStr.includes('no such host') ||
          errStr.includes('dns') ||
          errStr.includes('resolve')
        ) {
          result.errorType = 'DNS_FAILURE'
          result.errorMessage =
            'DNS_FAILURE: Could not resolve host api-publica.datajud.cnj.jus.br in container (resolv.conf issue or [::1]:53 connection refused).'
        } else if (errStr.includes('timeout') || errStr.includes('deadline')) {
          result.errorType = 'NETWORK_TIMEOUT'
          result.errorMessage = 'NETWORK_TIMEOUT: Server took too long to respond.'
        } else if (errStr.includes('connection refused')) {
          result.errorType = 'CONNECTION_REFUSED'
          result.errorMessage =
            'CONNECTION_REFUSED: Connection refused by the server (check routing or port 443).'
        } else {
          result.errorType = 'NETWORK_FAILURE'
          result.errorMessage = 'NETWORK_FAILURE: ' + String(err)
        }
      }
      return result
    }

    const apiResult = callDataJud(
      alias,
      apiKey,
      JSON.stringify({ size: 1, query: { match_all: {} } }),
    )
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
