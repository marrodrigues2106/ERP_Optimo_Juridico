routerAdd(
  'POST',
  '/backend/v1/email/test',
  (e) => {
    const body = e.requestInfo().body || {}

    const errors = {}
    if (!body.imap_host)
      errors.imap_host = new ValidationError('required', 'Host IMAP é obrigatório')
    if (!body.smtp_host)
      errors.smtp_host = new ValidationError('required', 'Host SMTP é obrigatório')
    if (!body.email_user)
      errors.email_user = new ValidationError('required', 'Usuário é obrigatório')
    if (!body.email_password)
      errors.email_password = new ValidationError('required', 'Senha é obrigatória')

    const imap_port = parseInt(body.imap_port, 10)
    const smtp_port = parseInt(body.smtp_port, 10)

    if (!imap_port) errors.imap_port = new ValidationError('required', 'Porta IMAP é obrigatória')
    if (!smtp_port) errors.smtp_port = new ValidationError('required', 'Porta SMTP é obrigatória')

    if (Object.keys(errors).length > 0) {
      throw new BadRequestError('Falha na validação dos campos de conexão.', errors)
    }

    const bridgeUrl = $secrets.get('EMAIL_BRIDGE_URL') || 'https://email-bridge.goskip.app'

    let res
    try {
      res = $http.send({
        url: bridgeUrl + '/api/test',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imap_host: body.imap_host,
          imap_port: imap_port,
          smtp_host: body.smtp_host,
          smtp_port: smtp_port,
          user: body.email_user,
          password: body.email_password,
          encryption: body.email_encryption || 'ssl_tls',
        }),
        timeout: 30,
      })
    } catch (err) {
      $app.logger().error('Email bridge transport error (test)', 'error', err.message)
      throw new BadRequestError('Serviço de e-mail temporariamente indisponível.', {
        bridge: new ValidationError(
          'bridge_unreachable',
          'Não foi possível conectar ao bridge de e-mail.',
        ),
      })
    }

    if (res.statusCode !== 200) {
      $app.logger().error('Email bridge error (test)', 'status', res.statusCode)
      throw new BadRequestError('Falha na conexão IMAP/SMTP', {
        connection: new ValidationError(
          'connection_failed',
          res.json?.error || 'Erro ao conectar com o servidor IMAP/SMTP através do bridge.',
        ),
      })
    }

    return e.json(200, {
      success: true,
      message: `Conexão IMAP/SMTP validada com sucesso.`,
    })
  },
  $apis.requireAuth(),
)
