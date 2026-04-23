routerAdd(
  'POST',
  '/backend/v1/email/send',
  (e) => {
    const body = e.requestInfo().body || {}
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const smtpHost = user.getString('smtp_host')
    const emailUser = user.getString('email_user')
    const encryptedPass = user.getString('email_encrypted_password')

    if (!smtpHost || !emailUser || !encryptedPass) {
      return e.badRequestError(
        'Credenciais de e-mail incompletas ou incorretas. Por favor, configure seu perfil.',
      )
    }

    let key = $secrets.get('EMAIL_ENC_KEY') || ''
    if (key.length < 32) {
      key = (key + '00000000000000000000000000000000').substring(0, 32)
    }

    try {
      const dec = $security.decrypt(encryptedPass, key)
      if (!dec) throw new Error('Invalid password')
    } catch (err) {
      return e.badRequestError(
        'Credenciais de e-mail incompletas ou incorretas. Por favor, configure seu perfil.',
      )
    }

    if (!body.to || !body.subject || !body.body) {
      return e.badRequestError('Campos de e-mail incompletos.')
    }

    $app.logger().info('Simulated email send', 'to', body.to, 'subject', body.subject)

    return e.json(200, { success: true, message: 'E-mail enviado com sucesso (Simulado)' })
  },
  $apis.requireAuth(),
)
