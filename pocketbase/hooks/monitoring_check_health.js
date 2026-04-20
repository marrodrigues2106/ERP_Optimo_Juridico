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
    let douOnline = false

    // 1. PJe Portal Check
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
        log.set('module', 'PJe Monitoring')
        log.set('message', 'PJe portal check failed: ' + String(err))
        $app.save(log)
      } catch (_) {}
    }

    // 2. DataJud Check
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
        log.set('module', 'PJe Monitoring')
        log.set('message', 'DataJud API check failed: ' + String(err))
        $app.save(log)
      } catch (_) {}
    }

    // 3. Comunica PJe Check (Real service URL)
    try {
      let comunicaUrl = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao'
      try {
        const settings = $app.findRecordsByFilter('settings', "key = 'comunica_pje_url'", '', 1, 0)
        if (settings.length > 0 && settings[0].getString('value')) {
          comunicaUrl = settings[0].getString('value')
        }
      } catch (err) {}

      const scrapeRes = $http.send({
        url: comunicaUrl,
        method: 'GET',
        timeout: 15,
      })

      if (scrapeRes.statusCode > 0) {
        scrapingConnected = true
      } else {
        throw new Error(`Connection failed, status: ${scrapeRes.statusCode}`)
      }
    } catch (err) {
      try {
        const logCol = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(logCol)
        log.set('level', 'error')
        log.set('module', 'PJe Monitoring')
        log.set('message', 'Comunica PJe service check failed: ' + String(err))
        $app.save(log)
      } catch (_) {}
    }

    // 4. IN.GOV (DOU) Check
    let douStatusCode = 500
    let douErrorMsg = ''
    let douLatency = 0
    try {
      const startTime = Date.now()
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      ]
      const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)]

      const res = $http.send({
        url: 'https://www.in.gov.br/consulta/-/buscar/dou',
        method: 'GET',
        headers: {
          'User-Agent': randomUA,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          Referer: 'https://www.in.gov.br/consulta/-/buscar/dou',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 10,
      })

      douLatency = Date.now() - startTime
      douStatusCode = res.statusCode
      if (douStatusCode >= 200 && douStatusCode < 400) {
        douOnline = true
      } else if (douStatusCode === 403 || douStatusCode === 429) {
        douErrorMsg = 'Acesso bloqueado pelo portal DOU (403/429) - Possível bloqueio de segurança.'
        throw new Error(douErrorMsg)
      } else {
        douErrorMsg = `Erro HTTP: ${douStatusCode}`
        throw new Error(douErrorMsg)
      }
    } catch (err) {
      try {
        const logCol = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(logCol)
        log.set('level', 'error')
        log.set('module', 'monitoring')
        log.set('message', 'DOU IN.GOV health check failed: ' + String(err))
        $app.save(log)
      } catch (_) {}
    }

    config.set('douStatus', douStatusCode)
    config.set('douLatency', douLatency)
    config.set('douError', douErrorMsg)

    if (pjeOnline && datajudOnline && scrapingConnected && douOnline) {
      try {
        const logCol = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(logCol)
        log.set('level', 'info')
        log.set('module', 'PJe Monitoring')
        log.set('message', 'All PJe, DataJud and DOU monitoring checks passed successfully.')
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

    return e.json(200, { success: true, pjeOnline, datajudOnline, scrapingConnected, douOnline })
  },
  $apis.requireAuth(),
)
