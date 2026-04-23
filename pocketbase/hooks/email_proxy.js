// @deps imapflow@1.0.161, mailparser@3.6.9, nodemailer@6.9.13
routerAdd(
  'POST',
  '/backend/v1/email/test',
  async (e) => {
    const body = e.requestInfo().body || {}

    if (!body.smtp_host || !body.smtp_port || !body.email_user || !body.email_password) {
      return e.json(400, { success: false, message: 'Credenciais SMTP incompletas.' })
    }

    const encryption = body.email_encryption || 'ssl_tls'

    const nodemailer = require('nodemailer')
    const transporter = nodemailer.createTransport({
      host: body.smtp_host,
      port: body.smtp_port,
      secure: encryption === 'ssl_tls',
      tls: encryption === 'starttls' ? { ciphers: 'SSLv3' } : { rejectUnauthorized: false },
      auth: {
        user: body.email_user,
        pass: body.email_password,
      },
    })

    try {
      await transporter.verify()
      return e.json(200, { success: true, message: 'Conexão simulada com sucesso.' })
    } catch (err) {
      return e.json(400, { success: false, message: 'Falha na conexão: ' + err.message })
    }
  },
  $apis.requireAuth(),
)

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

routerAdd(
  'POST',
  '/backend/v1/email/send',
  async (e) => {
    const body = e.requestInfo().body || {}
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const smtpHost = user.getString('smtp_host')
    const smtpPort = user.getInt('smtp_port') || 465
    const emailUser = user.getString('email_user')
    const emailPass = user.getString('email_password')
    const encryption = user.getString('email_encryption') || 'ssl_tls'

    if (!smtpHost || !emailUser || !emailPass) {
      return e.badRequestError('Credenciais SMTP incompletas.')
    }

    const nodemailer = require('nodemailer')
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: encryption === 'ssl_tls',
      tls: { rejectUnauthorized: false },
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    })

    try {
      await transporter.sendMail({
        from: emailUser,
        to: body.to,
        subject: body.subject,
        text: body.body,
      })
      return e.json(200, { success: true, message: 'E-mail enviado com sucesso' })
    } catch (err) {
      $app.logger().error('SMTP send error', 'error', err.message)
      return e.badRequestError('Erro ao enviar e-mail: ' + err.message)
    }
  },
  $apis.requireAuth(),
)
