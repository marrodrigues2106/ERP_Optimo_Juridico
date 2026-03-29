onRecordDeleteRequest((e) => {
  const id = e.record.id

  try {
    $app.runInTransaction((txApp) => {
      txApp
        .db()
        .newQuery('DELETE FROM lawsuit_movements WHERE lawsuit = {:id}')
        .bind({ id: id })
        .execute()

      txApp
        .db()
        .newQuery('DELETE FROM lawsuit_notifications WHERE lawsuit = {:id}')
        .bind({ id: id })
        .execute()

      txApp
        .db()
        .newQuery('DELETE FROM agenda_events WHERE linked_lawsuit = {:id}')
        .bind({ id: id })
        .execute()
    })
  } catch (err) {
    console.error('Failed to clean up lawsuit dependencies', err)
    throw new BadRequestError('Something went wrong while processing your request.')
  }

  e.next()
}, 'lawsuits')
