cronAdd('pje_health_check', '*/15 * * * *', () => {
  const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
  if (configs.length === 0) return
  const config = configs[0]

  let pjeOnline = false
  let datajudOnline = false
  let scrapingConnected = false

  // 1. Comunica PJe Check
  try {
    let comunicaUrl = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao'
    let comunicaKey = $secrets.get('COMUNICA_PJE_KEY') || ''

    try {
      const settingsUrl = $app.findRecordsByFilter('settings', "key = 'comunica_pje_url'", '', 1, 0)
      if (settingsUrl.length > 0 && settingsUrl[0].getString('value'))
        comunicaUrl = settingsUrl[0].getString('value')

      const settingsKey = $app.findRecordsByFilter('settings', "key = 'comunica_pje_key'", '', 1, 0)
      if (settingsKey.length > 0 && settingsKey[0].getString('value'))
        comunicaKey = settingsKey[0].getString('value')
    } catch (err) {}

    const headers = { Accept: 'application/json' }
    if (comunicaKey) {
      headers['Authorization'] = comunicaKey.startsWith('Bearer')
        ? comunicaKey
        : 'Bearer ' + comunicaKey
    }

    const pjeRes = $http.send({
      url: comunicaUrl,
      method: 'GET',
      headers: headers,
      timeout: 15,
    })
    if (pjeRes.statusCode >= 200 && pjeRes.statusCode < 400) {
      pjeOnline = true
      scrapingConnected = true
    } else if (pjeRes.statusCode === 401 || pjeRes.statusCode === 403) {
      throw new Error(
        `Authentication Error: Invalid or expired API Key (HTTP ${pjeRes.statusCode})`,
      )
    } else {
      throw new Error(`HTTP Error: ${pjeRes.statusCode}`)
    }
  } catch (err) {
    try {
      const logCol = $app.findCollectionByNameOrId('system_logs')
      const log = new Record(logCol)
      log.set('level', 'error')
      log.set('module', 'pje-sync')
      log.set('message', 'Comunica PJe API check failed: ' + String(err))
      $app.save(log)
    } catch (_) {}
  }

  // 2. DataJud Check
  try {
    const apiKey = config.getString('apiKey') || $secrets.get('DATAJUD_API_KEY') || ''
    const djRes = $http.send({
      url: 'https://api-publica.datajud.cnj.jus.br/api_publica_stj/_search',
      method: 'POST',
      headers: { Authorization: 'APIKey ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ size: 1, query: { match_all: {} } }),
      timeout: 15,
    })

    if (djRes.statusCode >= 200 && djRes.statusCode < 400) {
      datajudOnline = true
      config.set('datajudLastError', '')
    } else if (djRes.statusCode === 401 || djRes.statusCode === 403) {
      config.set(
        'datajudLastError',
        `Authentication Error: Invalid API Key (HTTP ${djRes.statusCode})`,
      )
      throw new Error(`Authentication Error: Invalid API Key (HTTP ${djRes.statusCode})`)
    } else {
      config.set('datajudLastError', `HTTP Error: ${djRes.statusCode}`)
      throw new Error(`HTTP Error: ${djRes.statusCode}`)
    }
  } catch (err) {
    try {
      const logCol = $app.findCollectionByNameOrId('system_logs')
      const log = new Record(logCol)
      log.set('level', 'error')
      log.set('module', 'datajud-health')
      log.set('message', 'DataJud API check failed: ' + String(err))
      $app.save(log)
    } catch (_) {}
    if (!config.getString('datajudLastError')) {
      config.set('datajudLastError', 'Network/Timeout Error: ' + String(err))
    }
  }

  config.set('pje_status', pjeOnline ? 'online' : 'offline')
  config.set('pje_connection_status', scrapingConnected ? 'connected' : 'disconnected')
  config.set('datajudStatus', datajudOnline ? 'online' : 'offline')
  config.set('datajudLastCheckAt', new Date().toISOString())

  $app.save(config)
})
