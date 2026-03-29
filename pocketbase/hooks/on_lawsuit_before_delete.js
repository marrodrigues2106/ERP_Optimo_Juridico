onRecordDeleteRequest((e) => {
  const id = e.record.id

  // We use onRecordDeleteRequest instead of onRecordDelete to run our cleanup BEFORE
  // PocketBase's internal transaction checks for foreign key restrictions (which causes 400s).
  // Using a transaction (txApp) ensures atomicity and avoids "database is locked" errors
  // that occur when using the global $app.db() outside the request flow.
  // We use raw SQL to safely clean up dependent records to bypass `audit_logger`
  // and other model hooks that might fail when called programmatically.
  $app.runInTransaction((txApp) => {
    try {
      txApp
        .db()
        .newQuery('DELETE FROM lawsuit_movements WHERE lawsuit = {:id}')
        .bind({ id: id })
        .execute()
    } catch (err) {
      console.error('Failed to clean lawsuit_movements', err)
      throw new BadRequestError('Falha ao limpar movimentações associadas.')
    }

    try {
      txApp
        .db()
        .newQuery('DELETE FROM lawsuit_notifications WHERE lawsuit = {:id}')
        .bind({ id: id })
        .execute()
    } catch (err) {
      console.error('Failed to clean lawsuit_notifications', err)
      throw new BadRequestError('Falha ao limpar notificações associadas.')
    }

    try {
      txApp
        .db()
        .newQuery('DELETE FROM agenda_events WHERE linked_lawsuit = {:id}')
        .bind({ id: id })
        .execute()
    } catch (err) {
      console.error('Failed to clean agenda_events', err)
      throw new BadRequestError('Falha ao limpar eventos de agenda vinculados.')
    }
  })

  e.next()
}, 'lawsuits')
