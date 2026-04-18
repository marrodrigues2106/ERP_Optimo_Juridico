cronAdd('whatsapp_birthday', '0 9 * * *', () => {
  const url = $secrets.get('WHATSAPP_API_URL')
  const token = $secrets.get('WHATSAPP_API_KEY')
  if (!url || !token) return

  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const dateStr = `-${month}-${day}` // Matches MM-DD in strings like "1990-12-05"

  // Fetch all active clients with a birthDate set
  const records = $app.findRecordsByFilter(
    'clients',
    "birthDate != '' && classification != 'Inativo'",
    '-created',
    10000,
    0,
  )

  for (let client of records) {
    const birthDate = client.getString('birthDate')
    if (birthDate.includes(dateStr) && client.getString('phone')) {
      try {
        $http.send({
          url: url,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({
            to: client.getString('phone'),
            message: `Feliz aniversário, ${client.getString('name')}! Desejamos um dia maravilhoso e muito sucesso. - Moraes Rodrigues Advocacia`,
          }),
          timeout: 10,
        })
      } catch (err) {
        console.log('Error sending birthday WhatsApp to ' + client.id, err)
      }
    }
  }
})
