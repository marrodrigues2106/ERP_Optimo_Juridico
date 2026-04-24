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

    if (recipients.size > 0) {
      const orgao = gazette.getString('orgao') || 'DOU'
      let numList = gazette.get('numero_processo')
      let primaryNum = 'Publicação'
      if (numList) {
        if (typeof numList === 'string') primaryNum = numList
        else if (Array.isArray(numList) && numList.length > 0) primaryNum = numList[0]
      }
      const texto = gazette.getString('texto_normalizado') || ''

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
              subject: `Publicação DOU: ${primaryNum}`,
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
