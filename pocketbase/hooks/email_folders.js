// @deps imapflow@1.0.160
routerAdd(
  'POST',
  '/backend/v1/email/folders',
  async (e) => {
    const { ImapFlow } = require('imapflow')

    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const host = user.getString('imap_host')
    const port = user.getInt('imap_port') || 993
    const emailUser = user.getString('email_user')
    let password = user.getString('email_encrypted_password')
    const encryption = user.getString('email_encryption') || 'ssl_tls'

    if (!host || !emailUser || !password) {
      return e.badRequestError('Configurações de IMAP incompletas no perfil do usuário.')
    }

    try {
      const key = $secrets.get('EMAIL_ENCRYPTION_KEY') || '01234567890123456789012345678901'
      const decrypted = $security.decrypt(password, key)
      if (decrypted) password = decrypted
    } catch (err) {}

    const client = new ImapFlow({
      host: host,
      port: port,
      secure: encryption === 'ssl_tls',
      tls: { rejectUnauthorized: false },
      auth: { user: emailUser, pass: password },
      logger: false,
    })

    try {
      await client.connect()
      const list = await client.list()

      const folders = []
      for (const f of list) {
        let unread = 0
        try {
          const status = await client.status(f.path, { unseen: true })
          if (status && status.unseen) {
            unread = status.unseen
          }
        } catch (statusErr) {
          // Ignore errors on specific folders
        }

        folders.push({
          id: f.path,
          name: f.name,
          unread: unread,
          path: f.path,
        })
      }

      await client.logout()

      folders.sort((a, b) => {
        if (a.id.toUpperCase() === 'INBOX') return -1
        if (b.id.toUpperCase() === 'INBOX') return 1
        return a.name.localeCompare(b.name)
      })

      return e.json(200, folders)
    } catch (err) {
      $app.logger().error('IMAP connect error', 'error', err.message)
      return e.badRequestError('Erro de autenticação IMAP: ' + err.message)
    }
  },
  $apis.requireAuth(),
)
