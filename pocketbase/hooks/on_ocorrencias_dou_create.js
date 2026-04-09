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
        console.log(
          `[EMAIL DISPATCHER] Sending email to user: ${conf.get('usuario_id')} - Subject: Alerta Ro-DOU - ${termo.get('termo')}`,
        )
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
