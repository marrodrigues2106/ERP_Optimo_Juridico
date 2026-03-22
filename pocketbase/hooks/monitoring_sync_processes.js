routerAdd(
  'POST',
  '/backend/v1/monitoring/sync-processes',
  (e) => {
    try {
      const processes = $app.findRecordsByFilter('lawsuits', "status != 'Encerrado'", '', 100, 0)
      let count = 0
      for (let i = 0; i < processes.length; i++) {
        const p = processes[i]
        if (p.get('number')) {
          p.set('datajudStatus', 'Sync Requested')
          $app.saveNoValidate(p)
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
