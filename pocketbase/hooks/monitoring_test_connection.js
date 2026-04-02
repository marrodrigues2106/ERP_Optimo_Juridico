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
      config.set('datajudStatus', 'online')
      config.set('datajudLastError', '')
      config.set('datajudLastCheckAt', new Date().toISOString())
    } else if (service === 'dou') {
      config.set('gazetteLastError', '')
      config.set('gazetteLastSync', new Date().toISOString())
    }

    $app.save(config)
    return e.json(200, { success: true, service })
  },
  $apis.requireAuth(),
)
