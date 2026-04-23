// @deps nodemailer@6.9.13
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
