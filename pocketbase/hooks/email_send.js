// @deps nodemailer@6.9.14
routerAdd(
  'POST',
  '/backend/v1/email/send',
  async (e) => {
    const nodemailer = require('nodemailer')

    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const body = e.requestInfo().body

    const smtpHost = user.getString('smtp_host')
    const smtpPort = user.getInt('smtp_port') || 465
    const emailUser = user.getString('email_user')
    const encryptedPass = user.getString('email_encrypted_password')
    const encryption = user.getString('email_encryption') || 'ssl_tls'

    if (!smtpHost || !emailUser || !encryptedPass) {
      return e.badRequestError('Credenciais SMTP incompletas. Por favor, configure seu perfil.')
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

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: encryption === 'ssl_tls',
      auth: { user: emailUser, pass: password },
    })

    try {
      await transporter.sendMail({
        from: emailUser,
        to: body.to,
        subject: body.subject,
        html: body.body,
      })
      return e.json(200, { success: true })
    } catch (err) {
      console.error('SMTP Error:', err)
      return e.badRequestError('Erro ao enviar e-mail: ' + err.message)
    }
  },
  $apis.requireAuth(),
)
