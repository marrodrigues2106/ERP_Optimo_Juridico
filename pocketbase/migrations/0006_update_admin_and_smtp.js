migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    // 1. Admin Login Fix
    try {
      const existing = app.findAuthRecordByEmail('users', 'mmr.juridico@gmail.com')
      existing.setPassword('1234')
      existing.set('isAdmin', true)
      existing.setVerified(true)
      app.save(existing)
    } catch (err) {
      const admin = new Record(users)
      admin.setEmail('mmr.juridico@gmail.com')
      admin.setPassword('1234')
      admin.set('isAdmin', true)
      admin.setVerified(true)
      app.save(admin)
    }

    // 2. SMTP Configuration
    try {
      const settings = app.settings()

      // Set sender info
      settings.meta.senderName = 'Moraes Rodrigues Advocacia'
      settings.meta.senderAddress = 'contato@moraesrodriguesadvocacia.com.br'

      // Set SMTP config
      settings.smtp.enabled = true
      settings.smtp.host = 'smtp.hostinger.com'
      settings.smtp.port = 465
      settings.smtp.username = 'contato@moraesrodriguesadvocacia.com.br'
      settings.smtp.password = 'Afce@7492'

      // Attempt to persist if environment supports it
      if (typeof app.saveSettings === 'function') {
        app.saveSettings(settings)
      }
    } catch (e) {
      // Ignore error if settings configuration is not supported in this context
    }
  },
  (app) => {
    // Revert not required
  },
)
