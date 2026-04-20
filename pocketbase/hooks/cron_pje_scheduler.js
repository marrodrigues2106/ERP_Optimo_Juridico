cronAdd('pje_scheduler', '0 */2 * * *', () => {
  try {
    $app
      .db()
      .newQuery(`
      UPDATE legal_cases
      SET pje_sync_status = 'pending'
      WHERE lifecycle_status = 'Ativo'
        AND (pje_sync_status = 'idle' OR pje_sync_status = 'error' OR pje_sync_status = '' OR pje_sync_status IS NULL)
    `)
      .execute()
  } catch (err) {
    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logsCol)
      logRecord.set('level', 'error')
      logRecord.set('module', 'PJe Sync')
      logRecord.set('message', 'Scheduler error')
      logRecord.set('details', { error: err.message })
      $app.saveNoValidate(logRecord)
    } catch (e) {
      console.log('Error saving pje_scheduler log: ' + e.message)
    }
  }
})
