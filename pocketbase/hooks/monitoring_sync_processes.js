routerAdd(
  'POST',
  '/backend/v1/monitoring/sync-processes',
  (e) => {
    try {
      const processes = $app.findRecordsByFilter('lawsuits', "status != 'Encerrado'", '', 100, 0)
      let count = 0

      let url = $secrets.get('PB_INSTANCE_URL') || 'http://127.0.0.1:8090'
      if (url.endsWith('/')) url = url.slice(0, -1)

      for (let i = 0; i < processes.length; i++) {
        const p = processes[i]
        if (p.get('number')) {
          p.set('datajudStatus', 'Sync Requested')
          $app.saveNoValidate(p)

          // Fire and forget background sync to orchestrator
          try {
            $http.send({
              url: url + '/backend/v1/datajud/background-sync/' + p.id,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ secret: 'internal-async-trigger' }),
              timeout: 1, // Short timeout to immediately return control
            })
          } catch (err) {
            // Expected timeout error
          }

          count++
        }
      }

      return e.json(200, { success: true, count: count })
    } catch (err) {
      return e.json(500, { error: String(err) })
    }
  },
  $apis.requireAuth(),
)
