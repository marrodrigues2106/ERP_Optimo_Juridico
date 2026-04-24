cronAdd('task_deadlines', '0 8 * * *', () => {
  let apiKey = ''
  let fromEmail = 'onboarding@resend.dev'

  try {
    const keyRec = $app.findFirstRecordByData('settings', 'key', 'resend_api_key')
    apiKey = keyRec.getString('value')
    const fromRec = $app.findFirstRecordByData('settings', 'key', 'resend_from_email')
    fromEmail = fromRec.getString('value') || 'onboarding@resend.dev'
  } catch (err) {}

  const today = new Date()
  const next3Days = new Date()
  next3Days.setDate(today.getDate() + 3)

  const tasks = $app.findRecordsByFilter(
    'tasks',
    `status != 'completed' && deleted_at = '' && due_date >= '${today.toISOString()}' && due_date <= '${next3Days.toISOString()}'`,
    'due_date',
    100,
    0,
  )

  if (tasks.length === 0) return

  if (!apiKey) {
    const log = new Record($app.findCollectionByNameOrId('system_logs'))
    log.set('level', 'warning')
    log.set('module', 'cron')
    log.set('message', 'Cron task_deadlines falhou: RESEND_API_KEY ausente.')
    $app.save(log)
    return
  }

  tasks.forEach((task) => {
    try {
      const collabId = task.get('collaborator')
      let recipients = []

      if (collabId) {
        try {
          const collab = $app.findRecordById('collaborators', collabId)
          if (collab.get('email')) recipients.push(collab.get('email'))
        } catch (err) {}
      }

      const admins = $app.findRecordsByFilter(
        'users',
        "role = 'admin' || isAdmin = true",
        '',
        100,
        0,
      )
      admins.forEach((admin) => {
        const email = admin.getString('email')
        if (email && !recipients.includes(email)) recipients.push(email)
      })

      if (recipients.length === 0) return

      const htmlBody = `
        <h2>Lembrete de Prazo Próximo</h2>
        <p><strong>Tarefa:</strong> ${task.get('title')}</p>
        <p><strong>Prazo:</strong> ${task.get('due_date').substring(0, 10)}</p>
        <p><strong>Descrição:</strong> ${task.get('description')}</p>
        <hr />
        <a href="https://moraes-rodrigues-advocacia-5d1d2.goskip.app/intranet/dashboard">Acessar Dashboard do Sistema</a>
      `

      $http.send({
        url: 'https://api.resend.com/emails',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + apiKey,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: recipients,
          subject: `[Lembrete de Tarefa] Prazo próximo: ${task.get('title')}`,
          html: htmlBody,
        }),
        timeout: 30,
      })
    } catch (err) {
      $app.logger().error('Error sending task reminder', 'error', err.message)
    }
  })
})
