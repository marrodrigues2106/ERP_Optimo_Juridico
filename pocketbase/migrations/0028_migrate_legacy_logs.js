migrate(
  (app) => {
    if (!app.hasTable('lawsuits') || !app.hasTable('lawsuit_movements')) return

    const lawsuits = app.findRecordsByFilter('lawsuits', '1=1', '', 10000, 0)
    const movCol = app.findCollectionByNameOrId('lawsuit_movements')

    for (let i = 0; i < lawsuits.length; i++) {
      const ls = lawsuits[i]
      let logs = []

      try {
        const raw = ls.get('trackingLogs')
        if (typeof raw === 'string' && raw) logs = JSON.parse(raw)
        else if (Array.isArray(raw)) logs = raw
      } catch (e) {}

      if (!Array.isArray(logs)) continue

      for (let j = 0; j < logs.length; j++) {
        const log = logs[j]
        if (!log || !log.description) continue

        const dateStr = log.date || ls.get('created')
        const descStr = log.description
        const source = log.isManual ? 'Manual' : descStr.startsWith('Falha') ? 'Sistema' : 'DataJud'

        const hashInput = ls.id + '_' + dateStr + '_' + descStr + '_' + source
        let simpleHash = ''
        for (let k = 0; k < hashInput.length; k++) {
          simpleHash += hashInput.charCodeAt(k).toString(16)
        }
        simpleHash = simpleHash.substring(0, 150)

        try {
          app.findFirstRecordByFilter('lawsuit_movements', `hash = '${simpleHash}'`)
        } catch (e) {
          const rec = new Record(movCol)
          rec.set('lawsuit', ls.id)
          rec.set('event_date', dateStr)
          rec.set('description', descStr)
          rec.set('source', source)
          rec.set('hash', simpleHash)
          if (log.complementos && log.complementos.length > 0) {
            rec.set('metadata', { complementos: log.complementos })
          }
          app.save(rec)
        }
      }
    }
  },
  (app) => {},
)
