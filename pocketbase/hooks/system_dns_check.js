routerAdd(
  'GET',
  '/backend/v1/system/dns-check',
  (e) => {
    const host = 'api-publica.datajud.cnj.jus.br'
    const url = `https://${host}/`
    const start = Date.now()

    let result = {
      host: host,
      resolved: false,
      port443_reachable: false,
      latency: 0,
      error: null,
      detail: null,
    }

    try {
      const res = $http.send({
        url: url,
        method: 'HEAD',
        timeout: 10,
      })
      result.resolved = true
      result.port443_reachable = true
      result.latency = Date.now() - start
      result.detail = `HTTP ${res.statusCode}`
    } catch (err) {
      result.latency = Date.now() - start
      const errStr = String(err).toLowerCase()

      if (
        errStr.includes('no such host') ||
        errStr.includes('lookup') ||
        errStr.includes('dns') ||
        errStr.includes('resolve')
      ) {
        result.resolved = false
        result.port443_reachable = false
        result.error = 'DNS_FAILURE: Could not resolve host ' + host
        result.detail = String(err)
      } else if (errStr.includes('timeout') || errStr.includes('deadline')) {
        result.resolved = true
        result.port443_reachable = false
        result.error = 'NETWORK_TIMEOUT'
        result.detail = String(err)
      } else if (errStr.includes('connection refused')) {
        result.resolved = true
        result.port443_reachable = false
        result.error = 'CONNECTION_REFUSED'
        result.detail = String(err)
      } else {
        result.resolved = true
        result.port443_reachable = false
        result.error = 'SSL_OR_NETWORK_ERROR'
        result.detail = String(err)
      }
    }

    return e.json(200, result)
  },
  $apis.requireAuth(),
)
