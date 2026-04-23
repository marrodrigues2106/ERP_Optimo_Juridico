// @deps nodemailer@6.9.13
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
