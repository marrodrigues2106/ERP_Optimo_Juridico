routerAdd(
  'POST',
  '/backend/v1/monitoring/test-connection',
  (e) => {
    const body = e.requestInfo().body || {}
    const service = body.service || 'datajud'

    let apiKey = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
    try {
      const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
      if (configs.length > 0 && configs[0].get('apiKey')) {
        apiKey = configs[0].get('apiKey')
      }
    } catch (err) {}

    const start = Date.now()
    let res
    let errorMsg = null

    try {
      if (service === 'datajud') {
        res = $http.send({
          url: 'https://api-publica.datajud.cnj.jus.br/api_publica_stj/_search',
          method: 'POST',
          headers: {
            Authorization: 'APIKey ' + apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ size: 1, query: { match_all: {} } }),
          timeout: 30, // Strict 30s timeout per requirements
        })
      } else if (service === 'dou') {
        // Mocking egress test for DOU (using httpbin to verify network egress is healthy + simulate delay)
        res = $http.send({
          url: 'https://httpbin.org/get?source=dou_test',
          method: 'GET',
          headers: {
            'User-Agent': 'MonitoringSystem/1.0',
          },
          timeout: 30,
        })
      }
    } catch (err) {
      errorMsg = String(err)
    }

    const latency = Date.now() - start

    let debugSnippet = ''
    let status = 0

    if (res) {
      status = res.statusCode || 0
      try {
        debugSnippet = JSON.stringify(res.json, null, 2)
        if (debugSnippet.length > 1000) {
          debugSnippet =
            debugSnippet.substring(0, 1000) + '\n\n... (Resposta truncada por ser muito grande)'
        }
      } catch (parseErr) {
        debugSnippet = 'Raw body:\n' + (res.body ? String(res.body).substring(0, 500) : 'vazio')
      }
    } else {
      debugSnippet =
        'Falha na conexão.\n\nA solicitação não foi concluída. Isso geralmente ocorre devido a um timeout excedido (limite de 30 segundos atingido) ou recusa de rede.\n\nDetalhe técnico: Timeout Exceeded (30s) ou Connection Refused.\n\nMensagem original: ' +
        (errorMsg || 'Timeout/Unknown')
    }

    return e.json(200, {
      service: service,
      status: status,
      latency: latency,
      snippet: debugSnippet,
    })
  },
  $apis.requireAuth(),
)
