onRecordDelete((e) => {
  const id = e.record.id

  // Safely clean up dependent records to avoid Foreign Key constraint errors (400)
  try {
    const movements = $app.findRecordsByFilter(
      'lawsuit_movements',
      `lawsuit = '${id}'`,
      '',
      1000,
      0,
    )
    for (let i = 0; i < movements.length; i++) $app.delete(movements[i])
  } catch (err) {}

  try {
    const notifs = $app.findRecordsByFilter(
      'lawsuit_notifications',
      `lawsuit = '${id}'`,
      '',
      1000,
      0,
    )
    for (let i = 0; i < notifs.length; i++) $app.delete(notifs[i])
  } catch (err) {}

  try {
    const events = $app.findRecordsByFilter(
      'agenda_events',
      `linked_lawsuit = '${id}'`,
      '',
      1000,
      0,
    )
    for (let i = 0; i < events.length; i++) $app.delete(events[i])
  } catch (err) {}

  e.next()
}, 'lawsuits')
