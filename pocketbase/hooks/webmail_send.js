routerAdd(
  'POST',
  '/backend/v1/email/send',
  (e) => {
    const body = e.requestInfo().body || {}
    const to = body.to
    const subject = body.subject
    const html = body.body

    if (!to || !Array.isArray(to) || to.length === 0) {
      return e.badRequestError('Destinatários não informados.')
    }
    if (!subject) {
      return e.badRequestError('Assunto não informado.')
    }
    if (!html) {
      return e.badRequestError('Corpo da mensagem não informado.')
    }

    let apiKey = ''
    let fromEmail = ''

    try {
      const apiKeySetting = $app.findFirstRecordByData('settings', 'key', 'resend_api_key')
      apiKey = apiKeySetting.getString('value')
    } catch (_) {
      apiKey = $secrets.get('RESEND_API_KEY')
    }

    try {
      const fromEmailSetting = $app.findFirstRecordByData('settings', 'key', 'resend_from_email')
      fromEmail = fromEmailSetting.getString('value')
    } catch (_) {
      fromEmail = 'contato@moraesrodriguesadvocacia.com.br'
    }

    if (!apiKey) {
      return e.badRequestError(
        'Chave da API do Resend não configurada nas configurações do sistema.',
      )
    }
    if (!fromEmail) {
      return e.badRequestError('E-mail remetente não configurado nas configurações do sistema.')
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
        to: to,
        subject: subject,
        html: html,
      }),
      timeout: 15,
    })

    if (res.statusCode !== 200 && res.statusCode !== 201) {
      let errorMsg = 'Erro ao enviar e-mail.'
      try {
        if (res.json && res.json.message) {
          errorMsg = res.json.message
        } else {
          errorMsg = 'Erro desconhecido da API de e-mail (Status ' + res.statusCode + ').'
        }
      } catch (_) {}
      return e.badRequestError(errorMsg)
    }

    try {
      const orgId = e.auth?.getString('active_organization')
      const logsCol = $app.findCollectionByNameOrId('email_logs')

      for (let i = 0; i < to.length; i++) {
        const record = new Record(logsCol)
        if (orgId) {
          record.set('organization', orgId)
        }
        if (e.auth) {
          record.set('user', e.auth.id)
        }
        record.set('sent_at', new Date().toISOString())

        if (record.collection().fields.getByName('to')) {
          record.set('to', to[i])
        }
        if (record.collection().fields.getByName('subject')) {
          record.set('subject', subject)
        }

        $app.save(record)
      }
    } catch (err) {
      $app.logger().error('Failed to save email log', 'error', err.message)
    }

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
