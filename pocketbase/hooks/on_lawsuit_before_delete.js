onRecordDelete((e) => {
  const id = e.record.id

  // We use onRecordDelete instead of onRecordDeleteRequest so this runs for ANY deletion,
  // including those from the administrative interface or internal backend processes.
  // We use raw SQL to safely clean up dependent records to bypass model validation hooks.

  try {
    $app
      .db()
      .newQuery('DELETE FROM lawsuit_movements WHERE lawsuit = {:id}')
      .bind({ id: id })
      .execute()
  } catch (err) {
    console.error('Failed to clean lawsuit_movements', err)
  }

  try {
    $app
      .db()
      .newQuery('DELETE FROM lawsuit_notifications WHERE lawsuit = {:id}')
      .bind({ id: id })
      .execute()
  } catch (err) {
    console.error('Failed to clean lawsuit_notifications', err)
  }

  try {
    $app
      .db()
      .newQuery('DELETE FROM agenda_events WHERE linked_lawsuit = {:id}')
      .bind({ id: id })
      .execute()
  } catch (err) {
    console.error('Failed to clean agenda_events', err)
  }

  e.next()
}, 'lawsuits')
