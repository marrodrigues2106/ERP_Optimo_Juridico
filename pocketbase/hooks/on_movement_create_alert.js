onRecordAfterCreateSuccess((e) => {
  const movement = e.record

  try {
    let caseNumber = 'Desconhecido'
    let legalCase = null
    try {
      legalCase = $app.findRecordById('legal_cases', movement.get('case'))
      caseNumber = legalCase.get('case_number') || caseNumber
    } catch (err) {}

    const detail = movement.get('description')
    const date = movement.get('event_date') || ''
    const source = movement.get('source')
    const caseId = movement.get('case')
    const orgId = movement.get('organization') || (legalCase ? legalCase.get('organization') : null)

    // 1. DataJud Webhooks (Slack/Discord)
    if (source === 'DataJud') {
      const configs = $app.findRecordsByFilter('configuracoes_alerta', `ativo = true`, '', 100, 0)
      if (configs.length > 0) {
        const slackWebhook = $secrets.get('SLACK_WEBHOOK')
        const discordWebhook = $secrets.get('DISCORD_WEBHOOK')
        const webhookMsg = `⚖️ *Novo Movimento Detectado (DataJud)*\n*Processo:* ${caseNumber}\n*Data:* ${date}\n*Detalhe:*\n> ${detail}`

        for (let conf of configs) {
          const type = conf.get('tipo_notificacao')
          const freq = conf.get('frequencia')
          if (freq === 'diario') continue

          if ((type === 'slack' || type === 'all') && slackWebhook) {
            try {
              $http.send({
                url: slackWebhook,
                method: 'POST',
                body: JSON.stringify({ text: webhookMsg }),
                headers: { 'Content-Type': 'application/json' },
              })
            } catch (err) {}
          }
          if ((type === 'discord' || type === 'all') && discordWebhook) {
            try {
              $http.send({
                url: discordWebhook,
                method: 'POST',
                body: JSON.stringify({ content: webhookMsg }),
                headers: { 'Content-Type': 'application/json' },
              })
            } catch (err) {}
          }
        }
      }
    }

    // 2. Email Notifications
    if (legalCase) {
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
        log.set('message', 'Alerta de movimento falhou: RESEND_API_KEY ausente ou não configurada.')
        $app.save(log)
        return e.next()
      }

      const getAlertEmail = (userId, defaultEmail) => {
        try {
          const confs = $app.findRecordsByFilter(
            'configuracoes_alerta',
            `usuario_id = '${userId}'`,
            '',
            1,
            0,
          )
          if (confs.length > 0) {
            const dest = confs[0].getString('email_destinatario')
            if (dest) return dest
          }
        } catch (e) {}
        return defaultEmail
      }

      const recipients = new Set()

      // Admins
      try {
        const filterAdm = orgId
          ? `(role = 'admin' || isAdmin = true) && active_organization = '${orgId}'`
          : `role = 'admin' || isAdmin = true`
        const admins = $app.findRecordsByFilter('users', filterAdm, '', 100, 0)
        admins.forEach((a) => {
          if (a.getString('email')) recipients.add(getAlertEmail(a.id, a.getString('email')))
        })
      } catch (e) {}

      // Responsible Collaborator
      const respId = legalCase.get('responsible_collaborator')
      if (respId) {
        try {
          const collab = $app.findRecordById('collaborators', respId)
          const collabUserId = collab.get('user')
          if (collabUserId) {
            const collabUser = $app.findRecordById('users', collabUserId)
            if (collabUser.getString('email'))
              recipients.add(getAlertEmail(collabUser.id, collabUser.getString('email')))
          } else if (collab.getString('email')) {
            recipients.add(collab.getString('email'))
          }
        } catch (e) {}
      }

      if (recipients.size > 0) {
        const appUrl =
          $secrets.get('PB_INSTANCE_URL') || 'https://moraes-rodrigues-advocacia-5d1d2.goskip.app'
        const caseUrl = `${appUrl}/intranet/processos/${caseId}`
        const htmlBody = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #2563eb;">Novo Movimento Processual</h2>
                <p>Um novo andamento foi registrado no sistema.</p>
                <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>Processo:</strong> ${caseNumber}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Data:</strong> ${date.substring(0, 10)}</p>
                    <p style="margin: 0;"><strong>Descrição:</strong> ${detail}</p>
                </div>
                <a href="${caseUrl}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">Acessar Processo</a>
            </div>
        `

        for (const to of recipients) {
          try {
            $http.send({
              url: 'https://api.resend.com/emails',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + apiKey,
              },
              body: JSON.stringify({
                from: fromEmail,
                to: to,
                subject: `Aviso de Movimentação: Processo ${caseNumber}`,
                html: htmlBody,
              }),
              timeout: 15,
            })
          } catch (e) {
            $app.logger().error('Failed to send movement email alert', 'error', e.message)
          }
        }
      }
    }
  } catch (err) {
    $app.logger().error('[Movement Alert] Error', 'msg', err.message)
  }

  e.next()
}, 'case_movements')
