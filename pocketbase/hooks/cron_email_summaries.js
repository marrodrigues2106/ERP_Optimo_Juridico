// @deps date-fns@4.1.0
cronAdd('email_summaries', '0 8 * * *', () => {
  const { subDays, subWeeks, isFriday } = require('date-fns')

  const isWeeklyDay = isFriday(new Date())

  const configs = $app.findRecordsByFilter(
    'configuracoes_alerta',
    `ativo = true && (frequencia = 'daily' || frequencia = 'weekly')`,
    '',
    1000,
    0,
  )

  let apiKey = ''
  let fromEmail = 'onboarding@resend.dev'
  try {
    const keyRec = $app.findFirstRecordByData('settings', 'key', 'resend_api_key')
    apiKey = keyRec.getString('value')
    const fromRec = $app.findFirstRecordByData('settings', 'key', 'resend_from_email')
    fromEmail = fromRec.getString('value') || 'onboarding@resend.dev'
  } catch (err) {}

  if (!apiKey || apiKey === 'pending') return

  for (const conf of configs) {
    const freq = conf.getString('frequencia')
    if (freq === 'weekly' && !isWeeklyDay) continue

    const userId = conf.getString('usuario_id')
    const dest = conf.getString('email_destinatario')
    let userEmail = dest
    if (!userEmail) {
      try {
        const user = $app.findRecordById('users', userId)
        userEmail = user.getString('email')
      } catch (e) {}
    }
    if (!userEmail) continue

    const dateLimit =
      freq === 'weekly'
        ? subWeeks(new Date(), 1).toISOString().replace('T', ' ')
        : subDays(new Date(), 1).toISOString().replace('T', ' ')

    const notifs = $app.findRecordsByFilter(
      'notifications',
      `user_id = '${userId}' && created >= '${dateLimit}'`,
      '-created',
      100,
      0,
    )

    if (notifs.length === 0) continue

    let htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #2563eb;">Resumo de Alertas (${freq === 'weekly' ? 'Semanal' : 'Diário'})</h2>
            <p>Você tem <strong>${notifs.length}</strong> novo(s) alerta(s) no sistema:</p>
            <ul style="padding-left: 20px;">
    `

    for (const n of notifs) {
      const msg = n.getString('message')
      const date = n.getString('created').substring(0, 10)
      htmlBody += `<li style="margin-bottom: 10px;"><strong>${date}:</strong> ${msg}</li>`
    }

    htmlBody += `
            </ul>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">Acesse o sistema para ver mais detalhes.</p>
        </div>
    `

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
          to: userEmail,
          subject: `Resumo de Alertas - Moraes Rodrigues Advocacia`,
          html: htmlBody,
        }),
        timeout: 15,
      })
    } catch (e) {}
  }
})
