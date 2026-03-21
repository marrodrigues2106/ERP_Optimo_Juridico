migrate(
  (app) => {
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
  },
  (app) => {
    // Revert not required
  },
)
