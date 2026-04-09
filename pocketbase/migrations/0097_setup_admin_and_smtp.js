migrate(
  (app) => {
    // 1. Re-establish Admin User
    const usersCollection = app.findCollectionByNameOrId('users')
    let adminRecord

    try {
      adminRecord = app.findFirstRecordByData('users', 'email', 'mmr.juridico@gmail.com')
    } catch (_) {
      adminRecord = new Record(usersCollection)
      adminRecord.setEmail('mmr.juridico@gmail.com')
    }

    adminRecord.setPassword('12345678')
    adminRecord.setVerified(true)
    adminRecord.set('role', 'admin')
    adminRecord.set('isAdmin', true)
    adminRecord.set('name', 'Administrador')

    app.save(adminRecord)

    // 2. Configure SMTP Settings
    // Attempt to configure via raw SQL for older PocketBase versions (< v0.23)
    try {
      app
        .db()
        .newQuery(`
      UPDATE _params 
      SET value = json_set(value, 
        '$.smtp.enabled', json('true'), 
        '$.smtp.host', 'smtp.hostinger.com.br', 
        '$.smtp.port', 465, 
        '$.smtp.username', 'contato@moraesrodriguesadvocacia.com.br',
        '$.meta.senderName', 'Moraes Rodrigues Advocacia',
        '$.meta.senderAddress', 'contato@moraesrodriguesadvocacia.com.br'
      )
      WHERE id = 'settings'
    `)
        .execute()
    } catch (_) {}

    // Attempt to configure via app.settings() for newer PocketBase versions (>= v0.23)
    try {
      const settings = app.settings()
      if (settings) {
        settings.smtp.enabled = true
        settings.smtp.host = 'smtp.hostinger.com.br'
        settings.smtp.port = 465
        settings.smtp.username = 'contato@moraesrodriguesadvocacia.com.br'
        settings.meta.senderName = 'Moraes Rodrigues Advocacia'
        settings.meta.senderAddress = 'contato@moraesrodriguesadvocacia.com.br'
        app.save(settings)
      }
    } catch (_) {}
  },
  (app) => {
    // Safe down migration: do nothing to prevent accidental admin lockout or SMTP drop
  },
)
