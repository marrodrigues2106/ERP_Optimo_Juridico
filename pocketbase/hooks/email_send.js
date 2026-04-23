routerAdd(
  'POST',
  '/backend/v1/email/send',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const body = e.requestInfo().body || {}

    const errors = {}
    if (!body.to) errors.to = new ValidationError('required', 'Destinatário é obrigatório')
    if (!body.subject) errors.subject = new ValidationError('required', 'Assunto é obrigatório')
    if (!body.body) errors.body = new ValidationError('required', 'Corpo da mensagem é obrigatório')

    if (Object.keys(errors).length > 0) {
      throw new BadRequestError('Dados incompletos para envio do e-mail.', errors)
    }

    const host = user.getString('smtp_host')
    const port = user.getInt('smtp_port') || 587
    const emailUser = user.getString('email_user')
    const password = user.getString('email_encrypted_password')
    const encryption = user.getString('email_encryption') || 'ssl_tls'

    if (!host || !emailUser || !password) {
      return e.badRequestError('Configurações de SMTP incompletas no perfil do usuário.')
    }

    const bridgeUrl = $secrets.get('EMAIL_BRIDGE_URL') || 'https://email-bridge.goskip.app'

    let res
    try {
      res = $http.send({
        url: bridgeUrl + '/api/send',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp_host: host,
          smtp_port: port,
          user: emailUser,
          password: password,
          encryption: encryption,
          to: body.to,
          subject: body.subject,
          html: body.body,
        }),
        timeout: 30,
      })
    } catch (err) {
      $app.logger().error('Email bridge transport error (send)', 'error', err.message)
      throw new BadRequestError('Serviço de e-mail temporariamente indisponível.', {
        bridge: new ValidationError(
          'bridge_unreachable',
          'Não foi possível conectar ao bridge de e-mail.',
        ),
      })
    }

    if (res.statusCode !== 200) {
      $app.logger().error('Email bridge error (send)', 'status', res.statusCode)
      throw new BadRequestError('Erro ao enviar e-mail via SMTP.', {
        bridge: new ValidationError(
          'bridge_error',
          res.json?.error || 'Falha na comunicação com o servidor SMTP.',
        ),
      })
    }

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
