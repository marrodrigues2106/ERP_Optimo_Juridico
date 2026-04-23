routerAdd(
  'POST',
  '/backend/v1/email/inbox',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const body = e.requestInfo().body || {}
    const folder = body.folder || 'INBOX'
    const page = parseInt(body.page) || 1
    const limit = parseInt(body.limit) || 20
    const status = body.status || 'all'

    const host = user.getString('imap_host')
    const emailUser = user.getString('email_user')
    const password = user.getString('email_encrypted_password')

    if (!host || !emailUser || !password) {
      return e.badRequestError('Configurações de IMAP incompletas no perfil do usuário.')
    }

    const bridgeUrl = $secrets.get('EMAIL_BRIDGE_URL') || 'https://email-bridge.goskip.app'
    const port = user.getInt('imap_port') || 993
    const encryption = user.getString('email_encryption') || 'ssl_tls'

    let res
    try {
      res = $http.send({
        url: bridgeUrl + '/api/inbox',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imap_host: host,
          imap_port: port,
          user: emailUser,
          password: password,
          encryption: encryption,
          folder: folder,
          page: page,
          limit: limit,
          status: status,
        }),
        timeout: 30,
      })
    } catch (err) {
      $app.logger().error('Email bridge transport error (inbox)', 'error', err.message)
      throw new BadRequestError('Serviço de e-mail temporariamente indisponível.', {
        bridge: new ValidationError(
          'bridge_unreachable',
          'Não foi possível conectar ao bridge de e-mail.',
        ),
      })
    }

    if (res.statusCode !== 200) {
      $app.logger().error('Email bridge error (inbox)', 'status', res.statusCode)
      throw new BadRequestError('Erro ao buscar e-mails no servidor.', {
        bridge: new ValidationError(
          'bridge_error',
          res.json?.error || 'Falha na comunicação com o servidor IMAP.',
        ),
      })
    }

    return e.json(
      200,
      res.json || {
        items: [],
        totalItems: 0,
        page,
        perPage: limit,
        totalPages: 1,
      },
    )
  },
  $apis.requireAuth(),
)
