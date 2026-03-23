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
        errorType: 'CONFIG_MISSING',
      })
    }

    if (service === 'datajud') {
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
          service,
          status: 0,
          latency: 0,
          snippet: 'ERRO: Configuration Missing: DATAJUD_API_KEY secret is not set',
          errorType: 'API_KEY_MISSING',
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
            service,
            status: 0,
            latency: 0,
            snippet: `ERRO: Invalid Endpoint: Tribunal '${alias}' inactive`,
            errorType: 'ENDPOINT_INVALID',
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
          service,
          status: 0,
          latency: 0,
          snippet: `ERRO: Invalid Endpoint: Tribunal alias not recognized`,
          errorType: 'ENDPOINT_INVALID',
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
          result.rawResponse = res.json

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
              'DNS Failure: Could not resolve host api-publica.datajud.cnj.jus.br'
          } else if (errStr.includes('timeout') || errStr.includes('deadline')) {
            result.errorType = 'NETWORK_TIMEOUT'
            result.errorMessage = 'Connection Timeout: Server took too long to respond (30s)'
          } else if (errStr.includes('connection refused')) {
            result.errorType = 'NETWORK_REFUSED'
            result.errorMessage = 'Network Refused: Connection refused by the server'
          } else {
            result.errorType = 'NETWORK_FAILURE'
            result.errorMessage = 'Network Failure: ' + String(err)
          }
        }
        return result
      }

      const apiResult = callDataJud(
        alias,
        apiKey,
        JSON.stringify({ size: 1, query: { match_all: {} } }),
      )

      let snippet = ''
      if (apiResult.errorType !== 'online') {
        snippet = `ERRO: ${apiResult.errorMessage}.\n\n`
        if (apiResult.rawResponse)
          snippet += JSON.stringify(apiResult.rawResponse).substring(0, 150)
      } else {
        snippet = `SUCESSO: Conexão com DATAJUD estabelecida.\n\n`
        if (apiResult.rawResponse)
          snippet += JSON.stringify(apiResult.rawResponse).substring(0, 150) + '...'
      }

      updateConfigStatus(
        apiResult.statusCode,
        apiResult.latency,
        apiResult.errorType,
        apiResult.errorMessage,
      )

      return e.json(200, {
        service,
        status: apiResult.statusCode,
        latency: apiResult.latency,
        snippet,
        errorType: apiResult.errorType,
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
