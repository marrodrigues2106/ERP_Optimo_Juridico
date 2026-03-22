onRecordAfterUpdateSuccess((e) => {
  const getSafeLogs = (record) => {
    let raw = record.get('trackingLogs')
    if (!raw) return []
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
      } catch (err) {
        return []
      }
    }
    if (Array.isArray(raw)) return raw
    try {
      const parsed = JSON.parse(JSON.stringify(raw))
      return Array.isArray(parsed) ? parsed : []
    } catch (err) {
      return []
    }
  }

  const createNotifications = (record) => {
    try {
      const logs = getSafeLogs(record)
      if (logs.length === 0) return

      let notifyUserIds = []
      try {
        const users = $app.findRecordsByFilter('users', '1=1', '', 100, 0)
        for (let i = 0; i < users.length; i++) notifyUserIds.push(users[i].id)
      } catch (err) {}

      if (notifyUserIds.length === 0) return
      let notifsCol
      try {
        notifsCol = $app.findCollectionByNameOrId('lawsuit_notifications')
      } catch (err) {
        return
      }

      for (let i = 0; i < logs.length; i++) {
        const log = logs[i]
        if (!log || !log.description) continue

        for (let j = 0; j < notifyUserIds.length; j++) {
          const uid = notifyUserIds[j]
          try {
            const safeContent = String(log.description).replace(/'/g, "''").replace(/\\/g, '\\\\')
            $app.findFirstRecordByFilter(
              'lawsuit_notifications',
              `lawsuit = '${record.id}' && update_content = '${safeContent}' && user = '${uid}'`,
            )
          } catch (err) {
            try {
              const n = new Record(notifsCol)
              n.set('lawsuit', record.id)
              n.set('type', 'update')
              n.set('update_content', log.description)
              n.set('user', uid)
              n.set('is_read', false)
              $app.saveNoValidate(n)
            } catch (saveErr) {}
          }
        }
      }
    } catch (globalErr) {
      console.log('Global error in createNotifications:', globalErr)
    }
  }

  createNotifications(e.record)
  if (e.record.get('notifyClient') && e.record.get('client')) {
    console.log(
      `[SIMULATION] Notificando cliente via e-mail sobre atualização: ${e.record.get('parties')}`,
    )
  }

  if (e.record.get('datajudStatus') === 'Sync Requested') {
    try {
      let baseUrl = $secrets.get('PB_INSTANCE_URL')
      if (!baseUrl || baseUrl === '') {
        baseUrl = 'http://127.0.0.1:8090'
      }
      $http.send({
        url: baseUrl + '/backend/v1/datajud/background-sync/' + e.record.id,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: 'internal-async-trigger' }),
        timeout: 1,
      })
    } catch (err) {}
  }

  e.next()
}, 'lawsuits')
