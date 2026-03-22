onRecordValidate((e) => {
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

  const logs = getSafeLogs(e.record)
  e.record.set('trackingLogs', logs)
  e.next()
}, 'lawsuits')
