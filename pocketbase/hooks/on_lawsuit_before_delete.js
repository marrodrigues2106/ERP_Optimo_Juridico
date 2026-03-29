onRecordDelete((e) => {
  const id = e.record.id

  // We use raw SQL to safely clean up dependent records to avoid Foreign Key constraint errors (400)
  // This bypasses `audit_logger` and other model hooks that might fail when called programmatically
  // without an HTTP request context (e.requestInfo() throws in internal hooks).
  try {
    $app
      .db()
      .newQuery('DELETE FROM lawsuit_movements WHERE lawsuit = {:id}')
      .bind({ id: id })
      .execute()
  } catch (err) {
    console.error('Failed to delete lawsuit_movements', err)
    throw new BadRequestError('Falha ao limpar movimentações associadas.')
  }

  try {
    $app
      .db()
      .newQuery('DELETE FROM lawsuit_notifications WHERE lawsuit = {:id}')
      .bind({ id: id })
      .execute()
  } catch (err) {
    console.error('Failed to delete lawsuit_notifications', err)
    throw new BadRequestError('Falha ao limpar notificações associadas.')
  }

  try {
    $app
      .db()
      .newQuery('DELETE FROM agenda_events WHERE linked_lawsuit = {:id}')
      .bind({ id: id })
      .execute()
  } catch (err) {
    console.error('Failed to delete agenda_events', err)
    throw new BadRequestError('Falha ao limpar eventos de agenda vinculados.')
  }

  e.next()
}, 'lawsuits')
