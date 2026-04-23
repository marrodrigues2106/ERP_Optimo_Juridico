// @deps imapflow@1.0.161, mailparser@3.6.9
routerAdd(
  'GET',
  '/backend/v1/email/inbox',
  async (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const imapHost = user.getString('imap_host')
    const imapPort = user.getInt('imap_port') || 993
    const emailUser = user.getString('email_user')
    const emailPass = user.getString('email_password')
    const encryption = user.getString('email_encryption') || 'ssl_tls'

    if (!imapHost || !emailUser || !emailPass) {
      return e.badRequestError('Credenciais IMAP incompletas.')
    }

    const { ImapFlow } = require('imapflow')
    const { simpleParser } = require('mailparser')

    const client = new ImapFlow({
      host: imapHost,
      port: imapPort,
      secure: encryption === 'ssl_tls',
      tls: { rejectUnauthorized: false },
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      logger: false,
    })

    try {
      await client.connect()
      let lock = await client.getMailboxLock('INBOX')
      const messages = []

      try {
        let status = await client.status('INBOX', { messages: true })
        let total = status.messages
        if (total > 0) {
          let start = Math.max(1, total - 19)
          let seq = `${start}:*`
          for await (let msg of client.fetch(
            seq,
            { uid: true, envelope: true, source: true },
            { uid: false },
          )) {
            const parsed = await simpleParser(msg.source)
            messages.unshift({
              id: msg.uid.toString(),
              subject: parsed.subject || '(Sem Assunto)',
              from: parsed.from?.text || '(Desconhecido)',
              date: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
              body: parsed.html || parsed.textAsHtml || parsed.text || '(Sem conteúdo)',
              snippet: (parsed.text || '').substring(0, 100),
            })
          }
        }
      } finally {
        lock.release()
      }
      await client.logout()

      return e.json(200, messages)
    } catch (err) {
      $app.logger().error('IMAP fetch error', 'error', err.message)
      return e.badRequestError('Erro ao conectar ao servidor IMAP: ' + err.message)
    }
  },
  $apis.requireAuth(),
)
