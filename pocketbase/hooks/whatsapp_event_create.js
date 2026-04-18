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
      // Adjusting timezone manually to avoid VM limitations on Intls
      const offsetMs = d.getTimezoneOffset() * 60 * 1000
      const localD = new Date(d.getTime() - offsetMs)
      const dStr = localD.toISOString()
      dateStr = `${dStr.substring(8, 10)}/${dStr.substring(5, 7)}/${dStr.substring(0, 4)} às ${dStr.substring(11, 16)}`
    }

    $http.send({
      url: url,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        to: client.getString('phone'),
        message: `Olá ${client.getString('name')}, você tem um(a) ${type === 'Hearing' ? 'Audiência' : 'Reunião'} agendado(a) para ${dateStr}. Assunto: ${e.record.getString('title')}.`,
      }),
      timeout: 10,
    })
  } catch (err) {
    console.log('Error sending whatsapp event create:', err)
  }

  return e.next()
}, 'agenda_events')
