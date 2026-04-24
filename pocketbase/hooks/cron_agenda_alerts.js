cronAdd('agenda_alerts', '0 8 * * *', () => {
  try {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const dateStr = tomorrow.toISOString().split('T')[0]

    const events = $app.findRecordsByFilter(
      'agenda_events',
      `(type = 'Deadline' || type = 'Hearing') && start_date >= '${dateStr} 00:00:00' && start_date <= '${dateStr} 23:59:59'`,
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

    if ((!apiKey || apiKey === 'pending') && events.length > 0) {
      const log = new Record($app.findCollectionByNameOrId('system_logs'))
      log.set('level', 'warning')
      log.set('module', 'cron')
      log.set('message', 'Cron agenda_alerts falhou: RESEND_API_KEY ausente ou não configurada.')
      $app.save(log)
      return
    }

    for (const event of events) {
      const orgId = event.get('organization')
      const recipients = new Set()

      try {
        const filterAdm = orgId
          ? `(role = 'admin' || isAdmin = true) && active_organization = '${orgId}'`
          : `role = 'admin' || isAdmin = true`
        const admins = $app.findRecordsByFilter('users', filterAdm, '', 100, 0)
        admins.forEach((a) => {
          if (a.getString('email')) recipients.add(a.getString('email'))
        })
      } catch (e) {}

      const collabId = event.get('collaborator')
      if (collabId) {
        try {
          const collab = $app.findRecordById('collaborators', collabId)
          const collabUserId = collab.get('user')
          if (collabUserId) {
            const collabUser = $app.findRecordById('users', collabUserId)
            if (collabUser.getString('email')) recipients.add(collabUser.getString('email'))
          } else if (collab.getString('email')) {
            recipients.add(collab.getString('email'))
          }
        } catch (e) {}
      }

      const caseId = event.get('linked_lawsuit')
      let caseNumber = 'N/A'
      if (caseId) {
        try {
          const legalCase = $app.findRecordById('legal_cases', caseId)
          caseNumber = legalCase.get('case_number') || 'N/A'
          const respId = legalCase.get('responsible_collaborator')
          if (respId && respId !== collabId) {
            const collab = $app.findRecordById('collaborators', respId)
            const collabUserId = collab.get('user')
            if (collabUserId) {
              const collabUser = $app.findRecordById('users', collabUserId)
              if (collabUser.getString('email')) recipients.add(collabUser.getString('email'))
            } else if (collab.getString('email')) {
              recipients.add(collab.getString('email'))
            }
          }
        } catch (e) {}
      }

      if (recipients.size > 0) {
        const appUrl =
          $secrets.get('PB_INSTANCE_URL') || 'https://moraes-rodrigues-advocacia-5d1d2.goskip.app'
        const eventTitle = event.get('title')
        const eventDate = event.get('start_date')
        const eventType = event.get('type') === 'Hearing' ? 'Audiência' : 'Prazo'

        const htmlBody = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #2563eb;">Lembrete de ${eventType}</h2>
                <p>Um evento processual importante está agendado para amanhã.</p>
                <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>Evento:</strong> ${eventTitle}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Processo:</strong> ${caseNumber}</p>
                    <p style="margin: 0;"><strong>Data/Hora:</strong> ${eventDate}</p>
                </div>
                <a href="${appUrl}/intranet/agenda" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver Agenda</a>
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
                subject: `Lembrete: ${eventType} amanhã (${eventTitle})`,
                html: htmlBody,
              }),
              timeout: 15,
            })
          } catch (e) {
            $app.logger().error('Failed to send agenda email alert', 'error', e.message)
          }
        }
      }
    }
  } catch (err) {
    $app.logger().error('Agenda alerts cron error', 'error', err.message)
  }
})
