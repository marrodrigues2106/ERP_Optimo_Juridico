routerAdd(
  'POST',
  '/backend/v2/email/send',
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

    let apiKey = ''
    let fromEmail = 'onboarding@resend.dev'

    try {
      const keyRec = $app.findFirstRecordByData('settings', 'key', 'resend_api_key')
      apiKey = keyRec.getString('value')
      const fromRec = $app.findFirstRecordByData('settings', 'key', 'resend_from_email')
      fromEmail = fromRec.getString('value') || 'onboarding@resend.dev'
    } catch (err) {}

    if (!apiKey || apiKey === 'pending') {
      const log = new Record($app.findCollectionByNameOrId('system_logs'))
      log.set('level', 'warning')
      log.set('module', 'email')
      log.set(
        'message',
        'Tentativa de envio de email falhou: RESEND_API_KEY ausente ou não configurada.',
      )
      $app.save(log)
      return e.badRequestError('Configuração da API do Resend não encontrada.')
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
        to: body.to,
        subject: body.subject,
        html: body.body,
      }),
      timeout: 15,
    })

    if (res.statusCode !== 200 && res.statusCode !== 201) {
      $app.logger().error('Resend API error', 'status', res.statusCode, 'body', res.raw)
      const errorMsg = res.json?.message || 'Falha ao enviar e-mail pelo Resend.'
      throw new BadRequestError(errorMsg)
    }

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
