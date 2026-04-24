routerAdd(
  'POST',
  '/backend/v1/email/test',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const body = e.requestInfo().body || {}
    const apiKey = body.resend_api_key
    const fromEmail = body.resend_from_email || 'onboarding@resend.dev'

    if (!apiKey) {
      throw new BadRequestError('Chave da API do Resend é obrigatória.')
    }

    const res = $http.send({
      url: 'https://api.resend.com/emails',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: 'mmr.juridico@gmail.com',
        subject: 'Teste de Integração - Resend API',
        html: '<p>Este é um e-mail de teste confirmando que a integração com o Resend está operante.</p>',
      }),
      timeout: 15,
    })

    if (res.statusCode !== 200 && res.statusCode !== 201) {
      $app.logger().error('Resend API test error', 'status', res.statusCode, 'body', res.raw)
      const errorMsg = res.json?.message || 'Falha de autorização ou erro no servidor Resend.'
      throw new BadRequestError(errorMsg)
    }

    return e.json(200, {
      success: true,
      message: `E-mail enviado com sucesso via Resend.`,
    })
  },
  $apis.requireAuth(),
)
