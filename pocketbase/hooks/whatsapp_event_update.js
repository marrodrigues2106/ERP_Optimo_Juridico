onRecordAfterUpdateSuccess((e) => {
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

    $http.send({
      url: url,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        to: client.getString('phone'),
        message: `Atualização: ${client.getString('name')}, seu(sua) ${type === 'Hearing' ? 'Audiência' : 'Reunião'} agora está agendado(a) para ${dateStr}. Assunto: ${e.record.getString('title')}.`,
      }),
      timeout: 10,
    })
  } catch (err) {
    console.log('Error sending whatsapp event update:', err)
  }

  return e.next()
}, 'agenda_events')
