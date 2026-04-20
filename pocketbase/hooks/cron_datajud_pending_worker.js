cronAdd('datajud_batch_worker', '* * * * *', () => {
  let pendingCases = []
  try {
    // Fetch up to 15 pending cases per minute to avoid timeout/overload
    pendingCases = $app.findRecordsByFilter(
      'legal_cases',
      "datajud_sync_status = 'Pending'",
      'updated ASC',
      15,
      0,
    )
  } catch (err) {}

  if (!pendingCases || pendingCases.length === 0) return

  let baseUrl = $secrets.get('PB_INSTANCE_URL')
  if (!baseUrl) baseUrl = 'http://127.0.0.1:8080'
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

  let successCount = 0
  let errorCount = 0

  for (const record of pendingCases) {
    record.set('datajud_sync_status', 'Syncing')
    try {
      $app.saveNoValidate(record)
    } catch (err) {
      continue
    }

    const url = `${baseUrl}/backend/v1/datajud/background-sync/${record.id}`

    try {
      const res = $http.send({
        url: url,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: 'internal-async-trigger' }),
        timeout: 45, // 45 seconds timeout per process
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        successCount++
        record.set('datajud_sync_status', 'Success')
        record.set('pje_sync_status', 'success')
        try {
          $app.saveNoValidate(record)
        } catch (e) {}
      } else {
        errorCount++
        record.set('datajud_sync_status', 'Error')
        record.set('pje_sync_status', 'error')
        try {
          $app.saveNoValidate(record)
        } catch (e) {}
      }
    } catch (err) {
      errorCount++
      record.set('datajud_sync_status', 'Error')
      try {
        $app.saveNoValidate(record)
      } catch (e) {}
    }
  }

  if (successCount > 0 || errorCount > 0) {
    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const log = new Record(logsCol)
      log.set('level', errorCount > 0 ? 'warning' : 'info')
      log.set('module', 'datajud_batch_worker')
      log.set(
        'message',
        `Lote finalizado: ${successCount} processo(s) com sucesso, ${errorCount} com erro(s).`,
      )

      // Attempt to assign the first organization available from the batch to the log
      if (pendingCases[0].get('organization')) {
        log.set('organization', pendingCases[0].get('organization'))
      }

      $app.saveNoValidate(log)
    } catch (e) {
      console.log('Failed to log batch sync completion', e)
    }
  }
})
