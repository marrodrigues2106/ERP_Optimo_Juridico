onRecordAfterCreateSuccess((e) => {
  const gazette = e.record
  try {
    const orgId = gazette.get('organization')
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
      log.set('message', 'Alerta de publicação falhou: RESEND_API_KEY ausente ou não configurada.')
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
          const freq = confs[0].getString('frequencia') || 'imediato'
          if (freq !== 'imediato') return null
          const dest = confs[0].getString('email_destinatario')
          if (dest) return dest
        }
      } catch (e) {}
      return defaultEmail
    }

    const orgao = gazette.getString('orgao') || 'Diário Oficial'
    let numList = gazette.get('numero_processo')
    let primaryNum = 'Publicação'
    if (numList) {
      if (typeof numList === 'string') primaryNum = numList
      else if (Array.isArray(numList) && numList.length > 0) primaryNum = numList[0]
    }
    const texto = gazette.getString('texto_normalizado') || ''

    const recipients = new Set()
    try {
      const filterAdm = orgId
        ? `(role = 'admin' || isAdmin = true) && active_organization = '${orgId}'`
        : `role = 'admin' || isAdmin = true`
      const admins = $app.findRecordsByFilter('users', filterAdm, '', 100, 0)
      admins.forEach((a) => {
        try {
          const notifCol = $app.findCollectionByNameOrId('notifications')
          const notif = new Record(notifCol)
          notif.set('user_id', a.id)
          notif.set('numero_processo', primaryNum)
          notif.set('message', `Nova publicação ${orgao}: ${texto.substring(0, 100)}...`)
          $app.save(notif)
        } catch (err) {}

        if (a.getString('email')) {
          const email = getAlertEmail(a.id, a.getString('email'))
          if (email) recipients.add(email)
        }
      })
    } catch (e) {}

    if (recipients.size > 0) {
      const htmlBody = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <h2 style="color: #2563eb;">Nova Publicação ${orgao}</h2>
              <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0;"><strong>Referência:</strong> ${primaryNum}</p>
                  <p style="margin: 0;"><strong>Texto:</strong> ${texto}</p>
              </div>
          </div>
      `
      for (const to of recipients) {
        if (!to) continue
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
              subject: `Nova Publicação: ${primaryNum}`,
              html: htmlBody,
            }),
            timeout: 15,
          })
        } catch (e) {}
      }
    }
  } catch (err) {}
  e.next()
}, 'gazette_publications')
