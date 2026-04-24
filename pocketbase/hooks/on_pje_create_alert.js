onRecordAfterCreateSuccess((e) => {
  const pje = e.record
  try {
    const orgId = pje.get('organization')
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
      log.set('message', 'Alerta PJe falhou: RESEND_API_KEY ausente ou não configurada.')
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

    const num = pje.getString('numeroProcesso')
    const tribunal = pje.getString('siglaTribunal') || 'PJe'
    const tipo = pje.getString('tipoComunicacao') || 'Comunicação'
    const texto = pje.getString('texto') || ''

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
          notif.set('numero_processo', num)
          notif.set('message', `Nova comunicação ${tribunal}: ${tipo}`)
          $app.save(notif)
        } catch (err) {}

        if (a.getString('email')) {
          const email = getAlertEmail(a.id, a.getString('email'))
          if (email) recipients.add(email)
        }
      })
    } catch (e) {}

    const linkedCaseId = pje.get('linked_case')
    if (linkedCaseId) {
      try {
        const legalCase = $app.findRecordById('legal_cases', linkedCaseId)
        const respId = legalCase.get('responsible_collaborator')
        if (respId) {
          const collab = $app.findRecordById('collaborators', respId)
          const collabUserId = collab.get('user')

          if (collabUserId) {
            try {
              const notifCol = $app.findCollectionByNameOrId('notifications')
              const notif = new Record(notifCol)
              notif.set('user_id', collabUserId)
              notif.set('numero_processo', num)
              notif.set('message', `Nova comunicação ${tribunal}: ${tipo}`)
              $app.save(notif)
            } catch (err) {}

            const collabUser = $app.findRecordById('users', collabUserId)
            if (collabUser.getString('email')) {
              const email = getAlertEmail(collabUser.id, collabUser.getString('email'))
              if (email) recipients.add(email)
            }
          } else if (collab.getString('email')) {
            recipients.add(collab.getString('email'))
          }
        }
      } catch (e) {}
    }

    if (recipients.size > 0) {
      const htmlBody = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <h2 style="color: #2563eb;">Nova Comunicação ${tribunal}</h2>
              <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0;"><strong>Processo:</strong> ${num}</p>
                  <p style="margin: 0 0 10px 0;"><strong>Tipo:</strong> ${tipo}</p>
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
              subject: `Comunicação PJe: ${num}`,
              html: htmlBody,
            }),
            timeout: 15,
          })
        } catch (e) {}
      }
    }
  } catch (err) {}
  e.next()
}, 'pje_communications')
