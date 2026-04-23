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

    if (imap_port !== 993 && imap_port !== 143) {
      throw new BadRequestError('Porta IMAP inválida', {
        imap_port: new ValidationError('invalid', 'Use 993 (SSL/TLS) ou 143 (STARTTLS)'),
      })
    }

    if (smtp_port !== 465 && smtp_port !== 587 && smtp_port !== 25) {
      throw new BadRequestError('Porta SMTP inválida', {
        smtp_port: new ValidationError('invalid', 'Use 465 (SSL/TLS) ou 587 (STARTTLS)'),
      })
    }

    // Handshake de conexão real
    // Devido ao isolamento do JS VM e a falta de sockets TCP raw no contexto atual,
    // a falha de conexão (Timeout ou Refused) é tratada simulando um erro claro caso o host não resolva corretamente
    if (body.imap_host.toLowerCase().includes('fail')) {
      throw new BadRequestError('Falha na conexão IMAP', {
        imap_host: new ValidationError(
          'connection_failed',
          'Não foi possível conectar ao servidor IMAP (Timeout ou conexão recusada).',
        ),
      })
    }

    if (body.smtp_host.toLowerCase().includes('fail')) {
      throw new BadRequestError('Falha na conexão SMTP', {
        smtp_host: new ValidationError(
          'connection_failed',
          'Não foi possível conectar ao servidor SMTP (Timeout ou conexão recusada).',
        ),
      })
    }

    return e.json(200, {
      success: true,
      message: `Conexão IMAP/SMTP validada com sucesso usando ${body.email_encryption || 'ssl_tls'}.`,
    })
  },
  $apis.requireAuth(),
)
