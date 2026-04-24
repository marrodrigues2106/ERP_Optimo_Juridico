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

    let encryption = body.email_encryption
    if (!encryption || encryption === '' || encryption === 'none') {
      if (smtp_port === 465) {
        encryption = 'ssl_tls'
      } else if (smtp_port === 587) {
        encryption = 'starttls'
      } else {
        encryption = 'starttls'
      }
    }

    // For Hostinger and similar shared hosts, explicitly pass strict TLS parameters if needed,
    // or rely on the bridge recognizing 'ssl_tls' / 'starttls' properly.

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
          encryption: encryption,
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
      const errorMsg =
        res.json?.error || 'Erro ao conectar com o servidor IMAP/SMTP através do bridge.'

      let code = 'connection_failed'
      let userMessage = errorMsg
      const lowerMsg = errorMsg.toLowerCase()

      if (
        lowerMsg.includes('auth') ||
        lowerMsg.includes('login') ||
        lowerMsg.includes('credentials') ||
        lowerMsg.includes('authentication')
      ) {
        code = 'auth_failed'
        userMessage =
          'Falha na autenticação: Usuário ou senha incorretos para o servidor Hostinger/IMAP.'
      } else if (
        lowerMsg.includes('timeout') ||
        lowerMsg.includes('deadline') ||
        lowerMsg.includes('io: read/write on closed pipe')
      ) {
        code = 'timeout'
        userMessage =
          'Tempo de conexão esgotado: Verifique se o servidor e as portas estão corretas (ex: 993 para IMAP SSL e 465 para SMTP SSL/TLS).'
      } else if (
        lowerMsg.includes('certificate') ||
        lowerMsg.includes('tls') ||
        lowerMsg.includes('ssl') ||
        lowerMsg.includes('handshake') ||
        lowerMsg.includes('first record does not look like a tls handshake')
      ) {
        code = 'tls_error'
        userMessage =
          'Erro de Handshake SSL/TLS: Verifique se a porta corresponde à criptografia (Porta 465 exige SSL/TLS, Porta 587 exige STARTTLS).'
      } else if (lowerMsg.includes('no such host') || lowerMsg.includes('lookup')) {
        code = 'host_not_found'
        userMessage =
          'Servidor não encontrado: Verifique o endereço do host (ex: imap.hostinger.com / smtp.hostinger.com).'
      } else if (lowerMsg.includes('connection refused')) {
        code = 'connection_refused'
        userMessage = 'Conexão recusada pelo servidor: A porta informada pode estar incorreta.'
      } else {
        userMessage = `Erro ao conectar: ${errorMsg}`
      }

      throw new BadRequestError(userMessage, {
        connection: new ValidationError(code, userMessage),
      })
    }

    return e.json(200, {
      success: true,
      message: `Conexão IMAP/SMTP validada com sucesso.`,
    })
  },
  $apis.requireAuth(),
)
