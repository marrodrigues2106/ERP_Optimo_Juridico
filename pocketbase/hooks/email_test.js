// @deps imapflow@1.0.161
routerAdd(
  'POST',
  '/backend/v1/email/test',
  async (e) => {
    const { ImapFlow } = require('imapflow')

    const body = e.requestInfo().body
    if (!body || !body.imap_host || !body.email_user || !body.email_password) {
      return e.json(400, { success: false, message: 'Dados de conexão incompletos.' })
    }

    const client = new ImapFlow({
      host: body.imap_host,
      port: body.imap_port || 993,
      secure: body.email_encryption === 'ssl_tls',
      auth: { user: body.email_user, pass: body.email_password },
      logger: false,
    })

    try {
      await client.connect()
      await client.logout()
      return e.json(200, { success: true, message: 'Conexão IMAP bem-sucedida.' })
    } catch (err) {
      console.error('IMAP Test Error:', err)
      return e.json(400, { success: false, message: 'Falha na conexão: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
