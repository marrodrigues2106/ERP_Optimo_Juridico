routerAdd(
  'POST',
  '/backend/v1/email/send-template',
  (e) => {
    const body = e.requestInfo().body
    if (!body.to || !body.subject || !body.html) {
      throw new BadRequestError("Missing 'to', 'subject', or 'html' in request body")
    }

    const toList = Array.isArray(body.to) ? body.to : [body.to]
    const user = e.auth
    const orgId = user ? user.getString('active_organization') : null

    const MAX_DAILY = 100
    const MAX_MONTHLY = 3000

    let dailyCount = 0
    let monthlyCount = 0

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const startOfMonthStr = todayStr.substring(0, 8) + '01'

    if (orgId) {
      try {
        const resDaily = $app
          .db()
          .newQuery(
            `SELECT COUNT(id) as c FROM email_logs WHERE organization = {:org} AND sent_at >= {:date} `,
          )
          .bind({ org: orgId, date: todayStr + ' 00:00:00.000Z' })
          .one()
        dailyCount = resDaily.c || 0
      } catch (_) {}

      try {
        const resMonthly = $app
          .db()
          .newQuery(
            `SELECT COUNT(id) as c FROM email_logs WHERE organization = {:org} AND sent_at >= {:date} `,
          )
          .bind({ org: orgId, date: startOfMonthStr + ' 00:00:00.000Z' })
          .one()
        monthlyCount = resMonthly.c || 0
      } catch (_) {}
    }

    if (dailyCount + toList.length > MAX_DAILY || monthlyCount + toList.length > MAX_MONTHLY) {
      throw new BadRequestError(
        `Limite de envio de e-mails atingido. (Você tem ${MAX_DAILY - dailyCount} envios diários restantes)`,
      )
    }

    let senderName = $app.settings().meta.senderName || 'Escritório de Advocacia'
    let senderAddress = $app.settings().meta.senderAddress || 'no-reply@escritorio.com.br'

    if (orgId) {
      try {
        const org = $app.findRecordById('organizations', orgId)
        if (org && org.getString('name')) {
          senderName = org.getString('name')
        }
      } catch (_) {}
    }

    const message = new mailer.Message({
      from: {
        address: senderAddress,
        name: senderName,
      },
      to: toList.map((email) => ({ address: email })),
      subject: body.subject,
      html: body.html,
    })

    $app.newMailClient().send(message)

    try {
      const emailLogsCol = $app.findCollectionByNameOrId('email_logs')
      for (const email of toList) {
        const eLog = new Record(emailLogsCol)
        if (orgId) eLog.set('organization', orgId)
        if (user) eLog.set('user', user.id)
        eLog.set('sent_at', new Date().toISOString())
        $app.save(eLog)
      }
    } catch (_) {}

    const logCol = $app.findCollectionByNameOrId('system_logs')
    const log = new Record(logCol)
    log.set('level', 'info')
    log.set('module', 'email')
    log.set('message', 'email_sent')
    log.set('details', { to: toList, subject: body.subject })
    if (orgId) log.set('organization', orgId)
    if (user) log.set('user', user.id)
    $app.save(log)

    return e.json(200, { success: true, message: 'Email sent successfully' })
  },
  $apis.requireAuth(),
)
