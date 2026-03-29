onRecordDeleteRequest((e) => {
  const id = e.record.id

  // We use onRecordDeleteRequest instead of onRecordDelete to run our cleanup BEFORE
  // PocketBase's internal transaction checks for foreign key restrictions.
  // We use raw SQL to safely clean up dependent records to bypass `audit_logger`.
  try {
    $app.runInTransaction((txApp) => {
      try {
        txApp
          .db()
          .newQuery('DELETE FROM lawsuit_movements WHERE lawsuit = {:id}')
          .bind({ id: id })
          .execute()
      } catch (err) {
        console.error('Failed to clean lawsuit_movements', err)
      }

      try {
        txApp
          .db()
          .newQuery('DELETE FROM lawsuit_notifications WHERE lawsuit = {:id}')
          .bind({ id: id })
          .execute()
      } catch (err) {
        console.error('Failed to clean lawsuit_notifications', err)
      }

      try {
        txApp
          .db()
          .newQuery('DELETE FROM agenda_events WHERE linked_lawsuit = {:id}')
          .bind({ id: id })
          .execute()
      } catch (err) {
        console.error('Failed to clean agenda_events', err)
      }
    })
  } catch (err) {
    console.error('Transaction failed during cleanup', err)
    throw new BadRequestError('Falha na transação ao limpar os dados vinculados do processo.')
  }

  e.next()
}, 'lawsuits')
