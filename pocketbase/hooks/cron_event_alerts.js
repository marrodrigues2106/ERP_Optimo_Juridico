cronAdd('event_alerts', '*/15 * * * *', () => {
  try {
    const now = new Date()
    const limit = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ')
    const events = $app.findRecordsByFilter(
      'agenda_events',
      `alert_time != '' && alert_time != 'none' && alert_sent = false && deleted_at = '' && start_date >= '${now.toISOString().replace('T', ' ')}' && start_date <= '${limit}'`,
      '',
      100,
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

    for (const ev of events) {
      const startDateStr = ev.getString('start_date')
      if (!startDateStr) continue
      const startD = new Date(startDateStr)
      const alertTime = ev.getString('alert_time')
      let offsetMs = 0
      if (alertTime === '15m') offsetMs = 15 * 60000
      else if (alertTime === '30m') offsetMs = 30 * 60000
      else if (alertTime === '1h') offsetMs = 60 * 60000
      else if (alertTime === '1d') offsetMs = 24 * 60 * 60000

      if (now.getTime() >= startD.getTime() - offsetMs) {
        const alertType = ev.getString('alert_type')
        if (!alertType || alertType === 'none') continue

        const recipients = new Set()
        const userIds = new Set()
        const collabId = ev.getString('collaborator')
        if (collabId) {
          try {
            const col = $app.findRecordById('collaborators', collabId)
            const u = col.getString('user')
            if (u) userIds.add(u)
            if (col.getString('email')) recipients.add(col.getString('email'))
          } catch (e) {}
        }

        if (alertType === 'in-app' || alertType === 'both') {
          for (const uid of userIds) {
            const notif = new Record($app.findCollectionByNameOrId('notifications'))
            notif.set('user_id', uid)
            notif.set('message', `Lembrete: Evento '${ev.getString('title')}' começará em breve.`)
            notif.set('is_read', false)
            try {
              $app.save(notif)
            } catch (e) {}
          }
        }

        if ((alertType === 'email' || alertType === 'both') && apiKey && recipients.size > 0) {
          const orgId = ev.getString('organization')
          let phone = 'Não informado'
          if (orgId) {
            try {
              const orgRec = $app.findRecordById('organizations', orgId)
              phone = orgRec.getString('phone') || 'Não informado'
            } catch (e) {}
          }
          const footer = `<p style="margin-top: 20px; font-size: 12px; color: #666; border-top: 1px solid #eaeaea; padding-top: 10px;">Dúvidas? Fale conosco no WhatsApp: ${phone}</p>`

          const htmlBody = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #2563eb;">Lembrete de Evento</h2>
                <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>Evento:</strong> ${ev.getString('title')}</p>
                    <p style="margin: 0;"><strong>Data/Hora:</strong> ${startDateStr}</p>
                </div>
                ${footer}
            </div>
          `
          for (const to of recipients) {
            try {
              $http.send({
                url: 'https://api.resend.com/emails',
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
                body: JSON.stringify({
                  from: fromEmail,
                  to: to,
                  subject: `Lembrete: ${ev.getString('title')}`,
                  html: htmlBody,
                }),
                timeout: 15,
              })
            } catch (e) {}
          }
        }

        ev.set('alert_sent', true)
        try {
          $app.save(ev)
        } catch (e) {}
      }
    }
  } catch (e) {
    $app.logger().error('Event alerts error', 'error', e.message)
  }
})
