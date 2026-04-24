onRecordAfterCreateSuccess((e) => {
  const finance = e.record
  try {
    const orgId = finance.get('organization')
    let dispatcher = null
    try {
      const filter = orgId
        ? `is_system_dispatcher = true && active_organization = '${orgId}'`
        : `is_system_dispatcher = true`
      dispatcher = $app.findFirstRecordByFilter('users', filter)
    } catch (err) {}

    if (dispatcher) {
      const host = dispatcher.getString('smtp_host')
      const port = dispatcher.getInt('smtp_port') || 587
      const emailUser = dispatcher.getString('email_user')
      const password = dispatcher.getString('email_encrypted_password')
      const encryption = dispatcher.getString('email_encryption') || 'ssl_tls'

      if (host && emailUser && password) {
        const recipients = new Set()
        try {
          const filterAdm = orgId
            ? `(role = 'admin' || isAdmin = true || role = 'financial_user') && active_organization = '${orgId}'`
            : `role = 'admin' || isAdmin = true || role = 'financial_user'`
          const admins = $app.findRecordsByFilter('users', filterAdm, '', 100, 0)
          admins.forEach((a) => {
            if (a.getString('email')) recipients.add(a.getString('email'))
          })
        } catch (e) {}

        if (recipients.size > 0) {
          const amount = finance.get('amount')
          const type = finance.get('type') === 'inflow' ? 'Receita' : 'Despesa'
          const desc = finance.getString('description')

          const htmlBody = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                  <h2 style="color: #2563eb;">Novo Registro Financeiro</h2>
                  <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
                      <p style="margin: 0 0 10px 0;"><strong>Tipo:</strong> ${type}</p>
                      <p style="margin: 0 0 10px 0;"><strong>Valor:</strong> R$ ${amount}</p>
                      <p style="margin: 0;"><strong>Descrição:</strong> ${desc}</p>
                  </div>
              </div>
          `
          const bridgeUrl = $secrets.get('EMAIL_BRIDGE_URL') || 'https://email-bridge.goskip.app'
          for (const to of recipients) {
            try {
              $http.send({
                url: bridgeUrl + '/api/v2/send',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  smtp_host: host,
                  smtp_port: port,
                  user: emailUser,
                  password: password,
                  encryption: encryption,
                  to: to,
                  subject: `Novo Registro Financeiro: ${desc}`,
                  html: htmlBody,
                }),
                timeout: 15,
              })
            } catch (e) {}
          }
        }
      }
    }
  } catch (err) {}
  e.next()
}, 'finances')
