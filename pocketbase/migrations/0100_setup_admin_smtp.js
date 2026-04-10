migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'contato@moraesrodriguesadvocacia.com.br')
    } catch (_) {
      const record = new Record(users)
      record.setEmail('contato@moraesrodriguesadvocacia.com.br')
      record.setPassword('Skip@Pass2026')
      record.setVerified(true)
      record.set('name', 'Admin MRA')
      record.set('role', 'admin')
      record.set('isAdmin', true)
      app.save(record)
    }

    try {
      const adminRec = app.findAuthRecordByEmail('_pb_users_auth_', 'mmr.juridico@gmail.com')
      adminRec.set('role', 'admin')
      adminRec.set('isAdmin', true)
      app.save(adminRec)
    } catch (_) {}

    const settings = app.settings()
    settings.meta.senderName = 'Moraes Rodrigues Advocacia'
    settings.meta.senderAddress = 'contato@moraesrodriguesadvocacia.com.br'
    settings.smtp.enabled = true
    settings.smtp.host = 'smtp.hostinger.com.br'
    settings.smtp.port = 465
    settings.smtp.username = 'contato@moraesrodriguesadvocacia.com.br'
    settings.smtp.password = $secrets.get('SMTP_PASSWORD') || 'Default!Pass'
    app.save(settings)
  },
  (app) => {
    // down
  },
)
