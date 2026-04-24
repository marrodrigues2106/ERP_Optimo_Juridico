onRecordAfterCreateSuccess((e) => {
  const movement = e.record
  const caseId = movement.get('case')
  if (!caseId) return e.next()

  try {
    const legalCase = $app.findRecordById('legal_cases', caseId)
    const responsibleId = legalCase.get('responsible_collaborator')

    const dispatchers = $app.findRecordsByFilter('users', 'is_system_dispatcher = true', '', 1, 0)
    if (!dispatchers || dispatchers.length === 0) return e.next()
    const dispatcher = dispatchers[0]

    const host = dispatcher.getString('smtp_host')
    const port = dispatcher.getInt('smtp_port') || 587
    const emailUser = dispatcher.getString('email_user')
    const password = dispatcher.getString('email_encrypted_password')
    const encryption = dispatcher.getString('email_encryption') || 'ssl_tls'

    if (!host || !emailUser || !password) return e.next()

    let recipients = []
    if (responsibleId) {
      try {
        const collab = $app.findRecordById('collaborators', responsibleId)
        if (collab.get('email')) recipients.push(collab.get('email'))
      } catch (err) {}
    }

    const admins = $app.findRecordsByFilter('users', "role = 'admin' || isAdmin = true", '', 100, 0)
    admins.forEach((admin) => {
      const email = admin.getString('email')
      if (email && !recipients.includes(email)) recipients.push(email)
    })

    if (recipients.length === 0) return e.next()

    const bridgeUrl = $secrets.get('EMAIL_BRIDGE_URL') || 'https://email-bridge.goskip.app'
    const caseTitle = legalCase.get('title') || legalCase.get('case_number') || 'Sem Título'
    const htmlBody = `
      <h2>Novo Andamento Processual Detectado</h2>
      <p><strong>Processo:</strong> ${caseTitle}</p>
      <p><strong>Data do Evento:</strong> ${movement.get('event_date')}</p>
      <p><strong>Descrição:</strong> ${movement.get('description')}</p>
      <hr />
      <p>Verifique no sistema para mais detalhes: <a href="https://moraes-rodrigues-advocacia-5d1d2.goskip.app/intranet/processos/${caseId}">Acessar Processo</a></p>
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
        subject: `[Alerta de Processo] Novo andamento - ${caseTitle}`,
        html: htmlBody,
      }),
      timeout: 30,
    })
  } catch (err) {
    $app.logger().error('Error sending movement notification via dispatcher', 'error', err.message)
  }

  e.next()
}, 'case_movements')
