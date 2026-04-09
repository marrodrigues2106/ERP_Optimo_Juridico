migrate(
  (app) => {
    // 1. Update API Rules for specific collections
    const collections = ['legal_cases', 'tasks', 'agenda_events']
    collections.forEach((colName) => {
      try {
        const col = app.findCollectionByNameOrId(colName)
        let userField = ''
        if (colName === 'legal_cases') userField = 'responsible_collaborator'
        if (colName === 'tasks') userField = 'collaborator'

        if (colName === 'agenda_events') {
          const rule =
            "(@request.auth.id != '') && organization = @request.auth.active_organization && (@request.auth.role = 'admin' || @request.auth.isAdmin = true || collaborator.user = @request.auth.id || participants.user ?= @request.auth.id || collaborator = '')"
          col.listRule = rule
          col.viewRule = rule
        } else {
          const rule = `(@request.auth.id != '') && organization = @request.auth.active_organization && (@request.auth.role = 'admin' || @request.auth.isAdmin = true || ${userField}.user = @request.auth.id || ${userField} = '')`
          col.listRule = rule
          col.viewRule = rule
        }
        app.save(col)
      } catch (e) {
        console.log(`Error updating rules for ${colName}:`, e)
      }
    })

    // 2. Setup SMTP and Email Templates
    try {
      const settings = app.settings()

      // SMTP Configuration
      settings.smtp.enabled = true
      settings.smtp.host = 'smtp.hostinger.com.br'
      settings.smtp.port = 465
      settings.smtp.username = 'contato@moraesrodriguesadvocacia.com.br'
      // Apply password if available in secrets, otherwise it must be configured manually
      const smtpPass = $secrets.get('SMTP_PASSWORD')
      if (smtpPass) {
        settings.smtp.password = smtpPass
      }

      settings.meta.senderName = 'Moraes Rodrigues Advocacia'
      settings.meta.senderAddress = 'contato@moraesrodriguesadvocacia.com.br'

      // Password Recovery Template setup
      settings.meta.appUrl = 'https://www.moraesrodriguesadvocacia.com.br'
      settings.meta.resetPasswordTemplate.subject = 'Recuperação de Senha'
      settings.meta.resetPasswordTemplate.body = `<p>Olá,</p>
<p>Você solicitou a recuperação de sua senha no sistema Moraes Rodrigues Advocacia.</p>
<p>Clique no link abaixo para redefinir sua senha:</p>
<p><a href="{APP_URL}/reset-password?token={TOKEN}" style="display:inline-block;padding:10px 20px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Redefinir Senha</a></p>
<p>Se você não solicitou isso, pode ignorar este e-mail com segurança.</p>`

      app.save(settings)
    } catch (e) {
      console.log('Error updating settings:', e)
    }
  },
  (app) => {
    // Revert not strictly required as settings can be manually disabled
  },
)
