cronAdd('birthday_alerts', '0 8 * * *', () => {
  const clients = $app.findRecordsByFilter('clients', "deleted_at = '' && classification = 'Ativo'")
  const today = new Date()
  const targetDate = new Date(today)
  targetDate.setDate(targetDate.getDate() + 3)
  const targetMonth = targetDate.getMonth() + 1
  const targetDay = targetDate.getDate()

  clients.forEach((client) => {
    const bdayStr = client.getString('birthDate')
    if (!bdayStr) return
    const bday = new Date(bdayStr)
    if (bday.getMonth() + 1 === targetMonth && bday.getDate() === targetDay) {
      const users = $app.findRecordsByFilter(
        'users',
        `active_organization = '${client.getString('organization')}'`,
      )
      users.forEach((user) => {
        try {
          const notif = new Record($app.findCollectionByNameOrId('notifications'))
          notif.set('user_id', user.id)
          notif.set('message', `O cliente ${client.getString('name')} faz aniversário em 3 dias!`)
          notif.set('client', client.id)
          notif.set('is_read', false)
          $app.save(notif)
        } catch (err) {
          console.error(err)
        }
      })
    }
  })
})
