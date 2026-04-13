routerAdd(
  'DELETE',
  '/backend/v1/dou/logs',
  (e) => {
    const records = $app.findRecordsByFilter('logs_processamento', '', '', 1000)
    let deleted = 0
    for (let r of records) {
      try {
        $app.delete(r)
        deleted++
      } catch (err) {}
    }
    return e.json(200, { success: true, deleted })
  },
  $apis.requireAuth(),
)
