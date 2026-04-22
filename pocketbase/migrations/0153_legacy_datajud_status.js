migrate((app) => {
  // Transfer any success datajud status to pje_sync_status if pje_sync_status is not set
  app
    .db()
    .newQuery(`
    UPDATE legal_cases 
    SET pje_sync_status = 'success', pje_last_sync = datajud_last_sync
    WHERE datajud_sync_status = 'Success' AND (pje_sync_status IS NULL OR pje_sync_status = '' OR pje_sync_status = 'idle')
  `)
    .execute()

  app
    .db()
    .newQuery(`
    UPDATE legal_cases 
    SET pje_sync_status = 'error', pje_last_sync = datajud_last_sync
    WHERE datajud_sync_status = 'Error' AND (pje_sync_status IS NULL OR pje_sync_status = '' OR pje_sync_status = 'idle')
  `)
    .execute()
})
