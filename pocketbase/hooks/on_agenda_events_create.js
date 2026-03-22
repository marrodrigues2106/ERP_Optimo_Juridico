onRecordAfterCreateSuccess((e) => {
  const record = e.record
  if (record.get('linked_lawsuit')) {
    try {
      const lawsuit = $app.findRecordById('lawsuits', record.get('linked_lawsuit'))
      if (lawsuit.get('notifyClient') && lawsuit.get('client')) {
        console.log(
          `[SIMULATION] Notificando cliente via e-mail sobre novo evento na agenda: ${record.get('title')}`,
        )
      }
    } catch (err) {}
  }
  e.next()
}, 'agenda_events')
