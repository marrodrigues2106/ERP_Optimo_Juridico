routerAdd(
  'POST',
  '/backend/v2/email/send',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const body = e.requestInfo().body || {}
    const errors = {}

    if (!body.to || (Array.isArray(body.to) && body.to.length === 0))
      errors.to = new ValidationError('required', 'Destinatário é obrigatório')
    if (!body.subject) errors.subject = new ValidationError('required', 'Assunto é obrigatório')
    if (!body.body) errors.body = new ValidationError('required', 'Corpo da mensagem é obrigatório')

    if (Object.keys(errors).length > 0) {
      throw new BadRequestError('Dados incompletos para envio do e-mail.', errors)
    }

    const toList = Array.isArray(body.to) ? body.to : [body.to]
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
            `SELECT COUNT(id) as c FROM email_logs WHERE organization = {:org} AND sent_at >= {:date} `,
          )
          .bind({ org: orgId, date: todayStr + ' 00:00:00.000Z' })
          .one()
        dailyCount = resDaily.c || 0
      } catch (_) {}

      try {
        const resMonthly = $app
          .db()
          .newQuery(
            `SELECT COUNT(id) as c FROM email_logs WHERE organization = {:org} AND sent_at >= {:date} `,
          )
          .bind({ org: orgId, date: startOfMonthStr + ' 00:00:00.000Z' })
          .one()
        monthlyCount = resMonthly.c || 0
      } catch (_) {}
    }

    if (dailyCount + toList.length > MAX_DAILY || monthlyCount + toList.length > MAX_MONTHLY) {
      throw new BadRequestError(
        `Limite de envio de e-mails atingido. (Você tem ${MAX_DAILY - dailyCount} envios diários restantes)`,
      )
    }

    let apiKey = ''
    try {
      const keyRec = $app.findFirstRecordByData('settings', 'key', 'resend_api_key')
      apiKey = keyRec.getString('value')
    } catch (_) {}

    let fromEmail = 'onboarding@resend.dev'
    let fromName = 'Escritório de Advocacia'

    try {
      const fromRec = $app.findFirstRecordByData('settings', 'key', 'resend_from_email')
      if (fromRec && fromRec.getString('value')) {
        fromEmail = fromRec.getString('value')
      }

      if (orgId) {
        const org = $app.findRecordById('organizations', orgId)
        if (org && org.getString('name')) {
          fromName = org.getString('name')
        }
      }
    } catch (err) {}

    if (!apiKey || apiKey === 'pending') {
      try {
        const log = new Record($app.findCollectionByNameOrId('system_logs'))
        log.set('level', 'error')
        log.set('module', 'email_send')
        log.set(
          'message',
          'Tentativa de envio de email falhou: RESEND_API_KEY ausente ou não configurada.',
        )
        if (orgId) log.set('organization', orgId)
        log.set('user', user.id)
        $app.saveNoValidate(log)
      } catch (_) {}

      throw new BadRequestError('Resend API Key not found in settings.')
    }

    let res
    try {
      res = $http.send({
        url: 'https://api.resend.com/emails',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + apiKey,
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: toList,
          subject: body.subject,
          html: body.body,
        }),
        timeout: 15,
      })
    } catch (err) {
      try {
        const log = new Record($app.findCollectionByNameOrId('system_logs'))
        log.set('level', 'error')
        log.set('module', 'email_send')
        log.set('message', 'Erro de rede ao conectar com Resend: ' + err.message)
        if (orgId) log.set('organization', orgId)
        log.set('user', user.id)
        $app.saveNoValidate(log)
      } catch (_) {}

      throw new BadRequestError(
        'Falha de conexão ao tentar enviar e-mail. O provedor pode estar indisponível.',
      )
    }

    if (res.statusCode !== 200 && res.statusCode !== 201) {
      const responseBody = res.json || { message: 'Erro desconhecido (sem body parseável)' }

      $app.logger().error('Resend API error', 'status', res.statusCode, 'body', responseBody)

      try {
        const log = new Record($app.findCollectionByNameOrId('system_logs'))
        log.set('level', 'error')
        log.set('module', 'email_send')
        log.set('message', 'Resend API retornou erro status ' + res.statusCode)
        log.set('details', { status: res.statusCode, response: responseBody })
        if (orgId) log.set('organization', orgId)
        log.set('user', user.id)
        $app.saveNoValidate(log)
      } catch (_) {}

      const errorMsg = responseBody.message || 'Falha ao enviar e-mail pelo provedor externo.'
      throw new BadRequestError(errorMsg)
    }

    try {
      $app.runInTransaction((txApp) => {
        const emailLogsCol = txApp.findCollectionByNameOrId('email_logs')
        for (let i = 0; i < toList.length; i++) {
          const email = toList[i]
          const eLog = new Record(emailLogsCol)
          if (orgId) eLog.set('organization', orgId)
          if (user) eLog.set('user', user.id)
          eLog.set('sent_at', new Date().toISOString())
          txApp.saveNoValidate(eLog)
        }
      })
    } catch (_) {}

    try {
      const logCol = $app.findCollectionByNameOrId('system_logs')
      const sentLog = new Record(logCol)
      sentLog.set('level', 'info')
      sentLog.set('module', 'email_send')
      sentLog.set('message', 'email_sent')
      sentLog.set('details', { to: toList, subject: body.subject, resend_id: res.json?.id })
      if (orgId) sentLog.set('organization', orgId)
      sentLog.set('user', user.id)
      $app.saveNoValidate(sentLog)
    } catch (_) {}

    return e.json(200, { success: true, id: res.json?.id })
  },
  $apis.requireAuth(),
)
