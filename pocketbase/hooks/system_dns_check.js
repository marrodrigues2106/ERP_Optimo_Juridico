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
      global_dns_works: false,
      global_ip: null,
    }

    try {
      const dohRes = $http.send({
        url: `https://cloudflare-dns.com/dns-query?name=${host}&type=A`,
        method: 'GET',
        headers: { Accept: 'application/dns-json' },
        timeout: 5,
      })
      if (
        dohRes.statusCode === 200 &&
        dohRes.json &&
        dohRes.json.Answer &&
        dohRes.json.Answer.length > 0
      ) {
        result.global_dns_works = true
        result.global_ip = dohRes.json.Answer[0].data
      }
    } catch (err) {}

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
        result.error = 'DNS_FAILURE'
        result.detail =
          'DNS Resolution failed on backend runtime (resolv.conf). External check: ' +
          (result.global_dns_works ? `OK (${result.global_ip})` : 'FAILED') +
          '. Local err: ' +
          String(err)
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
