onRecordCreate((e) => {
  const record = e.record
  const num = record.get('number')

  // Datajud Simulation - populate initial tracking logs if a process number is provided
  if (num && !record.get('trackingLogs')) {
    const now = new Date()
    const past = new Date(now.getTime() - 86400000) // 1 day ago

    const mockLogs = [
      {
        date: past.toISOString(),
        description: 'Processo distribuído (Integração Datajud / D.O.).',
      },
      { date: now.toISOString(), description: 'Autuação e conclusão ao Magistrado.' },
    ]
    record.set('trackingLogs', mockLogs)
  }

  e.next()
}, 'lawsuits')

onRecordAfterUpdateSuccess((e) => {
  const record = e.record
  // Simulate sending an email to the client about updates
  if (record.get('notifyClient') && record.get('client')) {
    console.log(
      `[SIMULATION] Notificando cliente automaticamente via e-mail sobre atualização no processo: ${record.get('parties')}`,
    )
  }
  e.next()
}, 'lawsuits')

onRecordAfterCreateSuccess((e) => {
  const record = e.record
  // Simulate sending an email to the client about a new event linked to their case
  if (record.get('linked_lawsuit')) {
    try {
      const lawsuit = $app.findRecordById('lawsuits', record.get('linked_lawsuit'))
      if (lawsuit.get('notifyClient') && lawsuit.get('client')) {
        console.log(
          `[SIMULATION] Notificando cliente via e-mail sobre novo evento na agenda: ${record.get('title')}`,
        )
      }
    } catch (err) {
      // lawsuit might not exist or error fetching
    }
  }
  e.next()
}, 'agenda_events')
