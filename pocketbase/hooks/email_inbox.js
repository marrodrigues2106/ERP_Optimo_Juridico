// @deps imapflow@1.0.160, mailparser@3.6.4
routerAdd(
  'POST',
  '/backend/v1/email/inbox',
  async (e) => {
    const { ImapFlow } = require('imapflow')
    const { simpleParser } = require('mailparser')

    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const body = e.requestInfo().body || {}
    const folder = body.folder || 'INBOX'
    const page = parseInt(body.page) || 1
    const limit = parseInt(body.limit) || 20
    const status = body.status || 'all'

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

      let mailbox
      try {
        mailbox = await client.mailboxOpen(folder)
      } catch (err) {
        await client.logout()
        return e.notFoundError('Pasta não encontrada no servidor.')
      }

      let searchParams = { all: true }
      if (status === 'unread') searchParams = { seen: false }
      if (status === 'read') searchParams = { seen: true }

      const messages = await client.search(searchParams, { uid: true })
      messages.sort((a, b) => b - a)

      const totalItems = messages.length
      const totalPages = Math.ceil(totalItems / limit)

      const offset = (page - 1) * limit
      const paginatedUids = messages.slice(offset, offset + limit)

      const items = []

      if (paginatedUids.length > 0) {
        const fetchGenerator = client.fetch(
          paginatedUids,
          {
            uid: true,
            flags: true,
            envelope: true,
            source: true,
          },
          { uid: true },
        )

        const iterator = fetchGenerator[Symbol.asyncIterator]()
        while (true) {
          const result = await iterator.next()
          if (result.done) break
          const msg = result.value

          let snippet = ''
          let htmlBody = ''
          let parsedFrom = msg.envelope.from
            ? msg.envelope.from.map((f) => `${f.name || ''} <${f.address}>`).join(', ')
            : 'Desconhecido'
          let parsedTo = msg.envelope.to
            ? msg.envelope.to.map((f) => `${f.name || ''} <${f.address}>`).join(', ')
            : ''

          try {
            if (msg.source) {
              const parsed = await simpleParser(msg.source)
              snippet = parsed.text ? parsed.text.substring(0, 100).replace(/\n/g, ' ') + '...' : ''
              htmlBody = parsed.html || parsed.textAsHtml || parsed.text || ''
            }
          } catch (err) {
            $app.logger().error('Error parsing mail', 'uid', msg.uid, 'error', err.message)
          }

          items.push({
            id: msg.uid.toString(),
            from: parsedFrom,
            to: parsedTo,
            subject: msg.envelope.subject || '(Sem Assunto)',
            date: msg.envelope.date ? msg.envelope.date.toISOString() : new Date().toISOString(),
            snippet: snippet,
            body: htmlBody,
            read: msg.flags.has('\\Seen'),
          })
        }
      }

      await client.logout()

      items.sort((a, b) => parseInt(b.id) - parseInt(a.id))

      return e.json(200, {
        items: items,
        totalItems,
        page,
        perPage: limit,
        totalPages,
      })
    } catch (err) {
      $app.logger().error('IMAP inbox error', 'error', err.message)
      return e.badRequestError('Erro ao buscar e-mails: ' + err.message)
    }
  },
  $apis.requireAuth(),
)
