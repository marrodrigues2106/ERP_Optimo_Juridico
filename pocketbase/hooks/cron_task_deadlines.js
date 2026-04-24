cronAdd('task_deadlines', '0 8 * * *', () => {
  const dispatchers = $app.findRecordsByFilter('users', 'is_system_dispatcher = true', '', 1, 0)
  if (!dispatchers || dispatchers.length === 0) return
  const dispatcher = dispatchers[0]

  const host = dispatcher.getString('smtp_host')
  const port = dispatcher.getInt('smtp_port') || 587
  const emailUser = dispatcher.getString('email_user')
  const password = dispatcher.getString('email_encrypted_password')
  const encryption = dispatcher.getString('email_encryption') || 'ssl_tls'

  if (!host || !emailUser || !password) return

  const bridgeUrl = $secrets.get('EMAIL_BRIDGE_URL') || 'https://email-bridge.goskip.app'

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
        url: bridgeUrl + '/api/v2/send',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp_host: host,
          smtp_port: port,
          user: emailUser,
          password: password,
          encryption: encryption,
          to: recipients.join(','),
          subject: `[Lembrete de Tarefa] Prazo próximo: ${task.get('title')}`,
          html: htmlBody,
        }),
        timeout: 30,
      })
    } catch (err) {
      $app.logger().error('Error sending task reminder via dispatcher', 'error', err.message)
    }
  })
})
