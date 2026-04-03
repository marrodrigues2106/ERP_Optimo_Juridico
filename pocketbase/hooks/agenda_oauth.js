routerAdd(
  'POST',
  '/backend/v1/agenda/oauth',
  (e) => {
    const body = e.requestInfo().body
    const provider = body.provider
    const user = e.auth

    if (!user) {
      throw new UnauthorizedError('Autenticação necessária.')
    }

    if (provider === 'Google' || provider === 'Outlook') {
      const code = body.code
      if (!code) throw new BadRequestError('Código de autorização não fornecido.')

      // Simula a troca do código por um token de acesso real usando a API do provedor.
      // Em produção, isso faria uma requisição HTTP para o provider com o code e client_secret.
      const mockToken = 'oauth_token_' + $security.randomString(24)

      user.set('calendar_provider', provider)
      user.set('calendar_status', 'Connected')
      user.set('calendar_token', mockToken)

      $app.save(user)

      return e.json(200, {
        success: true,
        message: `${provider} calendar linked successfully.`,
        sync_status: 'Active',
      })
    }

    if (provider === 'iCloud') {
      const appleId = body.appleId
      const appPassword = body.appPassword

      if (!appleId || !appPassword)
        throw new BadRequestError('Apple ID e Senha Específica são obrigatórios.')

      // Armazena a credencial encriptada para sincronização CalDAV
      const token = $security.encrypt(
        appleId + ':' + appPassword,
        'chavesecreta32bytesparaencriptar',
      )

      user.set('calendar_provider', 'iCloud')
      user.set('calendar_status', 'Connected')
      user.set('calendar_token', token)

      $app.save(user)

      return e.json(200, {
        success: true,
        message: `iCloud calendar linked successfully.`,
        sync_status: 'Active',
      })
    }

    throw new BadRequestError('Provedor inválido.')
  },
  $apis.requireAuth(),
)
