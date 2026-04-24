onRecordAfterCreateSuccess((e) => {
  const type = e.record.getString('type')
  if (type !== 'Meeting' && type !== 'Hearing') return e.next()

  const clientId = e.record.getString('client')
  if (!clientId) return e.next()

  const url = $secrets.get('WHATSAPP_API_URL')
  const token = $secrets.get('WHATSAPP_API_KEY')
  if (!url || !token) return e.next()

  try {
    const client = $app.findRecordById('clients', clientId)
    if (!client.getString('phone')) return e.next()

    const date = e.record.getString('start_date')
    let dateStr = date
    if (date) {
      const d = new Date(date)
      const offsetMs = d.getTimezoneOffset() * 60 * 1000
      const localD = new Date(d.getTime() - offsetMs)
      const dStr = localD.toISOString()
      dateStr = `${dStr.substring(8, 10)}/${dStr.substring(5, 7)}/${dStr.substring(0, 4)} às ${dStr.substring(11, 16)}`
    }

    let orgName = 'nosso escritório'
    try {
      const orgId = e.record.getString('organization')
      if (orgId) {
        const org = $app.findRecordById('organizations', orgId)
        if (org && org.getString('name')) orgName = org.getString('name')
      }
    } catch (_) {}

    let templateMsg = `Olá {{name}}, você tem um(a) ${type === 'Hearing' ? 'Audiência' : 'Reunião'} agendado(a) para {{date}} com a equipe da {{nome_organizacao}}. Assunto: {{title}}.`
    try {
      const tmpl = $app.findFirstRecordByFilter(
        'communication_templates',
        `type = 'WhatsApp' && (name = 'Novo Evento' || name = 'Event Create' || name = 'Lembrete')`,
      )
      if (tmpl && tmpl.getString('body_html')) {
        templateMsg = tmpl
          .getString('body_html')
          .replace(/<[^>]*>?/gm, '')
          .replace(/&nbsp;/g, ' ')
          .trim()
      }
    } catch (_) {}

    const msg = templateMsg
      .replace(/\{\{name\}\}/gi, client.getString('name') || client.getString('fullName') || '')
      .replace(/\{\{date\}\}/gi, dateStr)
      .replace(/\{\{alert_date\}\}/gi, dateStr)
      .replace(/\{\{title\}\}/gi, e.record.getString('title') || '')
      .replace(/\{\{nome_organizacao\}\}/gi, orgName)
      .replace(/\{\{org_name\}\}/gi, orgName)
      .replace(/\{\{movement_description\}\}/gi, e.record.getString('description') || '')

    $http.send({
      url: url,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        to: client.getString('phone'),
        message: msg,
      }),
      timeout: 10,
    })
  } catch (err) {
    console.log('Error sending whatsapp event create:', err)
  }

  return e.next()
}, 'agenda_events')
