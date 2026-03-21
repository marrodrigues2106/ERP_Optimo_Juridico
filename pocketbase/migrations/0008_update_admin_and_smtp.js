migrate(
  (app) => {
    // 1. Configure SMTP
    const settings = app.settings()
    if (settings) {
      if (!settings.meta) settings.meta = {}
      if (!settings.smtp) settings.smtp = {}

      settings.meta.senderName = 'Moraes Rodrigues Advocacia'
      settings.meta.senderAddress = 'contato@moraesrodriguesadvocacia.com.br'

      settings.smtp.enabled = true
      settings.smtp.host = 'smtp.hostinger.com'
      settings.smtp.port = 465
      settings.smtp.username = 'contato@moraesrodriguesadvocacia.com.br'
      settings.smtp.password = 'Afce@7492'

      app.save(settings)
    }

    // 2. Allow 4-character passwords for the users collection
    const users = app.findCollectionByNameOrId('users')
    const pwdField = users.fields.getByName('password')
    if (pwdField) {
      pwdField.min = 4
      app.save(users)
    }

    // 3. Update admin user
    let admin
    try {
      admin = app.findAuthRecordByEmail('users', 'mmr.juridico@gmail.com')
    } catch (err) {
      admin = new Record(users)
      admin.setEmail('mmr.juridico@gmail.com')
    }

    admin.setPassword('Skip@2026')
    admin.set('isAdmin', true)
    admin.setVerified(true)

    app.save(admin)
  },
  (app) => {
    // Revert not required
  },
)
