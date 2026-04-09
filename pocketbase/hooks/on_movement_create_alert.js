onRecordAfterCreateSuccess((e) => {
  const movement = e.record
  if (movement.get('source') !== 'DataJud') return e.next()

  try {
    const configs = $app.findRecordsByFilter('configuracoes_alerta', `ativo = true`, '', 100, 0)
    if (configs.length === 0) return e.next()

    const slackWebhook = $secrets.get('SLACK_WEBHOOK')
    const discordWebhook = $secrets.get('DISCORD_WEBHOOK')

    let caseNumber = 'Desconhecido'
    try {
      const legalCase = $app.findRecordById('legal_cases', movement.get('case'))
      caseNumber = legalCase.get('case_number') || caseNumber
    } catch (err) {}

    const webhookMsg = `⚖️ *Novo Movimento Detectado (DataJud)*\n*Processo:* ${caseNumber}\n*Data:* ${movement.get('event_date')}\n*Detalhe:*\n> ${movement.get('description')}`

    for (let conf of configs) {
      const type = conf.get('tipo_notificacao')
      const freq = conf.get('frequencia')

      if (freq === 'diario') continue

      if ((type === 'slack' || type === 'all') && slackWebhook) {
        $http.send({
          url: slackWebhook,
          method: 'POST',
          body: JSON.stringify({ text: webhookMsg }),
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if ((type === 'discord' || type === 'all') && discordWebhook) {
        $http.send({
          url: discordWebhook,
          method: 'POST',
          body: JSON.stringify({ content: webhookMsg }),
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
  } catch (err) {
    console.error('[DataJud Alert] Error sending alert', err)
  }

  e.next()
}, 'case_movements')
