// @deps imapflow@1.0.161, mailparser@3.6.5
routerAdd(
  'GET',
  '/backend/v1/email/inbox',
  async (e) => {
    const { ImapFlow } = require('imapflow')
    const { simpleParser } = require('mailparser')

    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const folder = e.request.url.query().get('folder') || 'INBOX'

    const imapHost = user.getString('imap_host')
    const imapPort = user.getInt('imap_port') || 993
    const emailUser = user.getString('email_user')
    const encryptedPass = user.getString('email_encrypted_password')
    const encryption = user.getString('email_encryption') || 'ssl_tls'

    if (!imapHost || !emailUser || !encryptedPass) {
      return e.badRequestError(
        'Credenciais de e-mail incompletas ou incorretas. Por favor, configure seu perfil.',
      )
    }

    let key = $secrets.get('EMAIL_ENC_KEY') || ''
    if (key.length < 32) {
      key = (key + '00000000000000000000000000000000').substring(0, 32)
    }

    let password = ''
    try {
      password = $security.decrypt(encryptedPass, key)
      if (!password) throw new Error('Invalid password')
    } catch (err) {
      return e.badRequestError(
        'Erro ao descriptografar a senha do e-mail. Verifique suas credenciais.',
      )
    }

    const client = new ImapFlow({
      host: imapHost,
      port: imapPort,
      secure: encryption === 'ssl_tls',
      auth: { user: emailUser, pass: password },
      logger: false,
    })

    try {
      await client.connect()
      let lock = await client.getMailboxLock(folder)

      const messages = []
      const status = await client.status(folder, { messages: true })

      if (status.messages > 0) {
        const seq = Math.max(1, status.messages - 19) + ':' + status.messages
        for await (let msg of client.fetch(seq, { envelope: true, source: true, flags: true })) {
          const parsed = await simpleParser(msg.source)
          messages.push({
            id: msg.uid ? msg.uid.toString() : Math.random().toString(),
            subject: parsed.subject || '(Sem assunto)',
            from: parsed.from?.text || parsed.from?.value?.[0]?.address || 'Desconhecido',
            date: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
            body: parsed.html || parsed.textAsHtml || parsed.text || '',
            snippet: parsed.text ? parsed.text.substring(0, 100) : '',
            read: msg.flags ? msg.flags.has('\\Seen') : false,
          })
        }
      }

      lock.release()
      await client.logout()

      messages.reverse()

      return e.json(200, messages)
    } catch (err) {
      console.error('IMAP Error:', err)
      return e.badRequestError('Erro ao conectar no servidor IMAP: ' + err.message)
    }
  },
  $apis.requireAuth(),
)
