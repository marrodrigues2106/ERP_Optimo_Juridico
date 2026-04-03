cronAdd('datajud_background_sync', '0 */2 * * *', () => {
  try {
    const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
    if (configs.length === 0) return
    const config = configs[0]

    if (!config.get('sync_processos')) return

    const cases = $app.findRecordsByFilter(
      'legal_cases',
      "lifecycle_status = 'Ativo' && case_number != ''",
      'updated ASC',
      50,
      0,
    )

    const localUrl =
      ($secrets.get('PB_INSTANCE_URL') || 'http://127.0.0.1:8090') +
      '/backend/v1/datajud/background-sync/'

    let failCount = 0
    let successCount = 0

    for (let c of cases) {
      try {
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
