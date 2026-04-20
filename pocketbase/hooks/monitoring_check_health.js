routerAdd(
  'POST',
  '/backend/v1/monitoring/check-health',
  (e) => {
    const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
    if (configs.length === 0) return e.json(400, { error: 'No config found' })
    const config = configs[0]

    let pjeOnline = false
    let datajudOnline = false
    let scrapingConnected = false

    try {
      const pjeRes = $http.send({
        url: 'https://pje.cnj.jus.br/pje/login.seam',
        method: 'GET',
        timeout: 15,
      })
      if (pjeRes.statusCode >= 200 && pjeRes.statusCode < 400) {
        pjeOnline = true
      } else {
        throw new Error(`HTTP ${pjeRes.statusCode}`)
      }
    } catch (err) {
      try {
        const logCol = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(logCol)
        log.set('level', 'error')
        log.set('module', 'monitoring')
        log.set('message', 'PJe portal check failed: ' + String(err))
        $app.save(log)
      } catch (_) {}
    }

    try {
      const apiKey = config.getString('apiKey') || $secrets.get('DATAJUD_API_KEY')
      const djRes = $http.send({
        url: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjrj/_search',
        method: 'POST',
        headers: {
          Authorization: 'APIKey ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ size: 1, query: { match_all: {} } }),
        timeout: 15,
      })
      if (djRes.statusCode >= 200 && djRes.statusCode < 400) {
        datajudOnline = true
      } else {
        throw new Error(`HTTP ${djRes.statusCode}`)
      }
    } catch (err) {
      try {
        const logCol = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(logCol)
        log.set('level', 'error')
        log.set('module', 'monitoring')
        log.set('message', 'DataJud/Comunica PJe check failed: ' + String(err))
        $app.save(log)
      } catch (_) {}
    }

    try {
      const scrapeRes = $http.send({
        url: 'https://httpbin.org/status/200',
        method: 'GET',
        timeout: 10,
      })
      if (scrapeRes.statusCode === 200) {
        scrapingConnected = true
      } else {
        throw new Error(`HTTP ${scrapeRes.statusCode}`)
      }
    } catch (err) {
      try {
        const logCol = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(logCol)
        log.set('level', 'error')
        log.set('module', 'monitoring')
        log.set('message', 'PJe Scraping Service check failed: ' + String(err))
        $app.save(log)
      } catch (_) {}
    }

    config.set('pje_status', pjeOnline ? 'online' : 'offline')
    config.set('pje_connection_status', scrapingConnected ? 'connected' : 'disconnected')
    config.set('datajudStatus', datajudOnline ? 'online' : 'offline')
    config.set('datajudLastCheckAt', new Date().toISOString())
    if (!datajudOnline) {
      config.set('datajudLastError', 'Connection failed')
    } else {
      config.set('datajudLastError', '')
    }

    $app.save(config)

    return e.json(200, { success: true, pjeOnline, datajudOnline, scrapingConnected })
  },
  $apis.requireAuth(),
)
