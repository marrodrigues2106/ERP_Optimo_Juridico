routerAdd(
  'POST',
  '/backend/v1/monitoring/test-connection',
  (e) => {
    const body = e.requestInfo().body || {}
    const service = body.service || 'datajud'

    let url = ''
    let headers = {}

    if (service === 'datajud') {
      url = 'https://api-publica.datajud.cnj.jus.br/api_publica_stf/_search'
      let apiKey = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
      try {
        const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
        if (configs.length > 0 && configs[0].get('apiKey')) {
          apiKey = configs[0].get('apiKey')
        }
      } catch (err) {}
      headers = {
        Authorization: 'APIKey ' + apiKey,
        'Content-Type': 'application/json',
      }
    } else {
      // Mock endpoints for tribunal and dou to simulate external scraping tests
      url = 'https://httpbin.org/get'
      headers = { Accept: 'application/json' }
    }

    const start = Date.now()
    let res
    try {
      res = $http.send({
        url: url,
        method: service === 'datajud' ? 'POST' : 'GET',
        headers: headers,
        body: service === 'datajud' ? JSON.stringify({ size: 1, query: { match_all: {} } }) : null,
        timeout: 10,
      })
    } catch (err) {
      return e.json(500, {
        service: service,
        status: 0,
        latency: Date.now() - start,
        snippet: 'Falha de Conexão: ' + String(err),
      })
    }

    const latency = Date.now() - start
    let snippet = ''
    if (res.statusCode >= 200 && res.statusCode < 300) {
      snippet = `SUCESSO: Conexão com ${service.toUpperCase()} estabelecida.\n\n`
      if (res.body) {
        snippet += String(res.body).substring(0, 150) + '...'
      }
    } else {
      snippet = `ERRO: HTTP ${res.statusCode}.\n\n`
      if (res.body) {
        snippet += String(res.body).substring(0, 150)
      }
    }

    // Update latencies in configs
    try {
      const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
      if (configs.length > 0) {
        const c = configs[0]
        if (service === 'datajud') {
          c.set('lastStatus', res.statusCode)
          c.set('lastLatency', latency)
        } else if (service === 'tribunal') {
          c.set('tribunalStatus', res.statusCode)
          c.set('tribunalLatency', latency)
        } else if (service === 'dou') {
          c.set('douStatus', res.statusCode)
          c.set('douLatency', latency)
        }
        $app.saveNoValidate(c)
      }
    } catch (err) {}

    return e.json(200, {
      service: service,
      status: res.statusCode,
      latency: latency,
      snippet: snippet,
    })
  },
  $apis.requireAuth(),
)
