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
      const errorMsg =
        res.json?.error || 'Erro ao conectar com o servidor IMAP/SMTP através do bridge.'

      let code = 'connection_failed'
      let userMessage = errorMsg
      const lowerMsg = errorMsg.toLowerCase()

      if (
        lowerMsg.includes('auth') ||
        lowerMsg.includes('login') ||
        lowerMsg.includes('credentials')
      ) {
        code = 'auth_failed'
        userMessage = 'Falha na autenticação: Usuário ou senha incorretos.'
      } else if (lowerMsg.includes('timeout') || lowerMsg.includes('deadline')) {
        code = 'timeout'
        userMessage =
          'Tempo de conexão esgotado: Verifique o servidor e as portas (ex: porta 993 pode estar bloqueada).'
      } else if (
        lowerMsg.includes('certificate') ||
        lowerMsg.includes('tls') ||
        lowerMsg.includes('ssl')
      ) {
        code = 'tls_error'
        userMessage =
          'Erro de certificado SSL/TLS: Tente alterar a opção de criptografia para STARTTLS ou Nenhuma.'
      } else if (lowerMsg.includes('no such host') || lowerMsg.includes('lookup')) {
        code = 'host_not_found'
        userMessage = 'Servidor não encontrado: Verifique o endereço do host informado.'
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
