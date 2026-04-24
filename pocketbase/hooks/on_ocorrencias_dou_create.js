onRecordAfterCreateSuccess((e) => {
  const record = e.record

  try {
    $app.expandRecord(record, ['publicacao_id', 'termo_id'])
    const pub = record.expandedOne('publicacao_id')
    const termo = record.expandedOne('termo_id')

    if (!pub || !termo) {
      e.next()
      return
    }

    const userId = termo.get('usuario_id')
    let configs = []
    if (userId) {
      configs = $app.findRecordsByFilter(
        'configuracoes_alerta',
        `ativo = true && usuario_id = {:userId}`,
        '-created',
        10,
        0,
        { userId: userId },
      )
    }

    const slackWebhook = $secrets.get('SLACK_WEBHOOK')
    const discordWebhook = $secrets.get('DISCORD_WEBHOOK')
    const snippetClean = record
      .get('trecho_encontrado')
      .replace(/<%%>/g, '**')
      .replace(/<\/\%\%>/g, '**')

    const webhookMsg = `🚨 *Nova Ocorrência Ro-DOU*\n*Termo:* ${termo.get('termo')}\n*Publicação:* ${pub.get('titulo')}\n*Órgão:* ${pub.get('orgao')}\n*Fonte:* ${pub.get('fonte_coleta')}\n*Link:* ${pub.get('url_origem')}\n\n*Trecho:*\n> ${snippetClean}`

    for (let conf of configs) {
      const type = conf.get('tipo_notificacao')
      const freq = conf.get('frequencia')

      if (freq === 'diario') {
        continue // skip immediate sending for daily digests
      }

      if (type === 'slack' || type === 'all') {
        if (slackWebhook) {
          $http.send({
            url: slackWebhook,
            method: 'POST',
            body: JSON.stringify({ text: webhookMsg }),
            headers: { 'Content-Type': 'application/json' },
          })
        }
      }
      if (type === 'discord' || type === 'all') {
        if (discordWebhook) {
          $http.send({
            url: discordWebhook,
            method: 'POST',
            body: JSON.stringify({ content: webhookMsg }),
            headers: { 'Content-Type': 'application/json' },
          })
        }
      }
      if (type === 'email' || type === 'all') {
        try {
          const userObj = $app.findRecordById('users', conf.get('usuario_id'))
          const userEmail = userObj.getString('email')
          if (userEmail) {
            let dispatcher = null
            try {
              const filter = userObj.get('active_organization')
                ? `is_system_dispatcher = true && active_organization = '${userObj.get('active_organization')}'`
                : `is_system_dispatcher = true`
              dispatcher = $app.findFirstRecordByFilter('users', filter)
            } catch (err) {}

            if (dispatcher) {
              const host = dispatcher.getString('smtp_host')
              const port = dispatcher.getInt('smtp_port') || 587
              const emailUser = dispatcher.getString('email_user')
              const password = dispatcher.getString('email_encrypted_password')
              let encryption = dispatcher.getString('email_encryption')
              if (!encryption || encryption === '') {
                encryption = port === 465 ? 'ssl_tls' : 'starttls'
              }

              if (host && emailUser && password) {
                const bridgeUrl =
                  $secrets.get('EMAIL_BRIDGE_URL') || 'https://email-bridge.goskip.app'
                const htmlBody = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                        <h2 style="color: #2563eb;">Novo Alerta Ro-DOU</h2>
                        <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
                            <p style="margin: 0 0 10px 0;"><strong>Termo:</strong> ${termo.get('termo')}</p>
                            <p style="margin: 0 0 10px 0;"><strong>Publicação:</strong> ${pub.get('titulo')}</p>
                            <p style="margin: 0;"><strong>Trecho:</strong> ${snippetClean}</p>
                        </div>
                    </div>
                `
                $http.send({
                  url: bridgeUrl + '/api/v2/send',
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    smtp_host: host,
                    smtp_port: port,
                    user: emailUser,
                    password: password,
                    encryption: encryption,
                    to: userEmail,
                    subject: `Alerta Ro-DOU: ${termo.get('termo')}`,
                    html: htmlBody,
                  }),
                  timeout: 15,
                })
              }
            }
          }
        } catch (err) {
          console.error('[EMAIL DISPATCHER ERROR]', err)
        }
      }
    }

    record.set('status_alerta', 'enviado')
    $app.saveNoValidate(record)

    const logs = $app.findCollectionByNameOrId('logs_processamento')
    let logRec = new Record(logs)
    logRec.set('publicacao_id', record.get('publicacao_id'))
    logRec.set('etapa', 'Alerta Notificação')
    logRec.set('status', 'Sucesso')
    logRec.set('mensagem', 'Alerta disparado para a ocorrência ' + record.id)
    logRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
    $app.save(logRec)
  } catch (err) {
    console.error('[DOU] Error creating occurrence alert', err)
  }

  e.next()
}, 'ocorrencias_dou')
