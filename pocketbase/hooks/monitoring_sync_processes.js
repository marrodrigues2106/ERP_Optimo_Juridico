routerAdd(
  'POST',
  '/backend/v1/monitoring/sync-processes',
  (e) => {
    try {
      const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
      if (configs.length === 0) return e.json(400, { error: 'Config not found' })
      const config = configs[0]

      if (!config.get('sync_processos'))
        return e.json(400, { error: 'Sincronização de processos está desativada na configuração.' })

      const cases = $app.findRecordsByFilter(
        'legal_cases',
        "lifecycle_status = 'Ativo' && case_number != ''",
        'updated ASC',
        5,
        0,
      )
      const localUrl =
        ($secrets.get('PB_INSTANCE_URL') || 'http://127.0.0.1:8090') +
        '/backend/v1/datajud/background-sync/'

      let triggered = 0
      let failCount = 0
      for (let c of cases) {
        try {
          $http.send({
            url: localUrl + c.id,
            method: 'POST',
            body: JSON.stringify({ secret: 'internal-async-trigger' }),
            headers: { 'Content-Type': 'application/json' },
            timeout: 30,
          })
          triggered++
        } catch (err) {
          failCount++
        }
      }

      config.set('datajudLastCheckAt', new Date().toISOString())
      if (failCount > 0) {
        config.set('datajudLastError', `${failCount} cases failed to sync`)
        config.set('datajudStatus', 'warning')
      } else {
        config.set('datajudLastError', '')
        config.set('datajudStatus', 'online')
      }
      $app.saveNoValidate(config)

      return e.json(200, { success: true, triggered, failed: failCount })
    } catch (err) {
      return e.json(500, { error: String(err) })
    }
  },
  $apis.requireAuth(),
)
