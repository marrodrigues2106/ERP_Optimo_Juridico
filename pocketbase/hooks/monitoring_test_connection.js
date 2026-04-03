routerAdd(
  'POST',
  '/backend/v1/monitoring/test-connection',
  (e) => {
    const body = e.requestInfo().body || {}
    const service = body.service || 'datajud'

    const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
    if (configs.length === 0) return e.json(400, { error: 'Config not found' })
    const config = configs[0]

    if (service === 'datajud') {
      const apiKey = body.apiKey || config.get('apiKey') || $secrets.get('DATAJUD_API_KEY')
      if (!apiKey) {
        return e.json(400, { error: 'API Key not configured' })
      }
      try {
        const res = $http.send({
          url: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjrj/_search',
          method: 'POST',
          headers: {
            Authorization: 'APIKey ' + apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ size: 1, query: { match_all: {} } }),
          timeout: 15,
        })
        if (res.statusCode >= 400) {
          throw new Error(`HTTP ${res.statusCode}`)
        }
        config.set('datajudStatus', 'online')
        config.set('datajudLastError', '')
        config.set('datajudLastCheckAt', new Date().toISOString())
      } catch (err) {
        config.set('datajudStatus', 'error')
        config.set('datajudLastError', String(err))
        $app.save(config)
        return e.json(400, { error: 'DataJud API test failed: ' + String(err) })
      }
    } else if (service === 'dou') {
      config.set('gazetteLastError', '')
      config.set('gazetteLastSync', new Date().toISOString())
    }

    $app.save(config)
    return e.json(200, { success: true, service })
  },
  $apis.requireAuth(),
)
