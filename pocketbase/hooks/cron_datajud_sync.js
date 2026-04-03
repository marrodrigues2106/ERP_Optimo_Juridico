cronAdd('datajud_background_sync', '0 */2 * * *', () => {
  try {
    const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
    if (configs.length === 0) return
    const config = configs[0]

    if (!config.get('sync_processos')) return

    let monitoredTribunals = []
    try {
      const activeTribunals = $app.findRecordsByFilter('tribunals', 'active = true', '', 1000, 0)
      activeTribunals.forEach((t) => {
        let a = t.get('alias')
        if (a) monitoredTribunals.push(String(a).toLowerCase().trim())
      })
      const tList = config.get('tribunais') || []
      tList.forEach((t) => {
        if (t) monitoredTribunals.push(String(t).toLowerCase().trim())
      })
    } catch (e) {}

    // Increased batch size and ordered by oldest sync to ensure proper cycling
    const cases = $app.findRecordsByFilter(
      'legal_cases',
      "lifecycle_status = 'Ativo' && case_number != ''",
      'datajud_last_sync ASC',
      100,
      0,
    )

    const localUrl =
      ($secrets.get('PB_INSTANCE_URL') || 'http://127.0.0.1:8090') +
      '/backend/v1/datajud/background-sync/'

    let failCount = 0
    let successCount = 0

    for (let c of cases) {
      try {
        let courtAlias = c.get('court_alias')
        if (courtAlias) {
          courtAlias = String(courtAlias).toLowerCase().replace('api_publica_', '').trim()
          if (monitoredTribunals.length > 0 && !monitoredTribunals.includes(courtAlias)) {
            continue
          }
        }

        $http.send({
          url: localUrl + c.id,
          method: 'POST',
          body: JSON.stringify({ secret: 'internal-async-trigger' }),
          headers: { 'Content-Type': 'application/json' },
          timeout: 30,
        })
        successCount++
      } catch (err) {
        failCount++
      }
    }

    config.set('datajudLastCheckAt', new Date().toISOString())
    if (failCount > 0) {
      config.set(
        'datajudLastError',
        `${failCount} cases failed to sync out of ${failCount + successCount}`,
      )
      config.set('datajudStatus', 'warning')
    } else {
      config.set('datajudLastError', '')
      config.set('datajudStatus', 'online')
    }
    $app.saveNoValidate(config)
  } catch (err) {
    console.log('Cron datajud_sync error:', err)
  }
})
