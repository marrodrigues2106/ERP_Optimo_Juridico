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

    const orgId = user.getString('active_organization')

    const MAX_DAILY = 100
    const MAX_MONTHLY = 3000

    let dailyCount = 0
    let monthlyCount = 0

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const startOfMonthStr = todayStr.substring(0, 8) + '01'

    if (orgId) {
      try {
        const resDaily = $app
          .db()
          .newQuery(
            `SELECT COUNT(id) as c FROM system_logs WHERE module = 'email' AND message = 'email_sent' AND organization = {:org} AND created >= {:date} `,
          )
          .bind({ org: orgId, date: todayStr + ' 00:00:00.000Z' })
          .one()
        dailyCount = resDaily.c || 0
      } catch (_) {}

      try {
        const resMonthly = $app
          .db()
          .newQuery(
            `SELECT COUNT(id) as c FROM system_logs WHERE module = 'email' AND message = 'email_sent' AND organization = {:org} AND created >= {:date} `,
          )
          .bind({ org: orgId, date: startOfMonthStr + ' 00:00:00.000Z' })
          .one()
        monthlyCount = resMonthly.c || 0
      } catch (_) {}
    }

    if (dailyCount >= MAX_DAILY || monthlyCount >= MAX_MONTHLY) {
      throw new BadRequestError('Limite de envio de e-mails atingido (Máximo 100/dia ou 3000/mês).')
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

    const logCol = $app.findCollectionByNameOrId('system_logs')
    const sentLog = new Record(logCol)
    sentLog.set('level', 'info')
    sentLog.set('module', 'email')
    sentLog.set('message', 'email_sent')
    sentLog.set('details', { to: body.to, subject: body.subject })
    if (orgId) sentLog.set('organization', orgId)
    sentLog.set('user', user.id)
    $app.save(sentLog)

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
