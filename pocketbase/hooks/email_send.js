routerAdd(
  'POST',
  '/backend/v1/email/send',
  (e) => {
    const body = e.requestInfo().body || {}
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const smtpHost = user.getString('smtp_host')
    const emailUser = user.getString('email_user')
    const emailPass = user.getString('email_password')

    if (!smtpHost || !emailUser || !emailPass) {
      return e.badRequestError('Credenciais SMTP incompletas.')
    }

    if (!body.to || !body.subject || !body.body) {
      return e.badRequestError('Campos de e-mail incompletos.')
    }

    // Log the simulated email send
    $app.logger().info('Simulated email send', 'to', body.to, 'subject', body.subject)

    // Simulate successful email sending
    return e.json(200, { success: true, message: 'E-mail enviado com sucesso (Simulado)' })
  },
  $apis.requireAuth(),
)
