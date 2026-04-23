routerAdd(
  'GET',
  '/backend/v1/email/inbox',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const imapHost = user.getString('imap_host')
    const emailUser = user.getString('email_user')
    const emailPass = user.getString('email_password')

    if (!imapHost || !emailUser || !emailPass) {
      return e.badRequestError('Credenciais IMAP incompletas.')
    }

    // Since native Node.js modules are not available in the PocketBase JSVM,
    // we mock the inbox data for demonstration purposes so the UI functions.
    const messages = [
      {
        id: 'mock-1',
        subject: 'Atualização do Processo 0001234-56.2023.8.26.0000',
        from: 'Tribunal de Justiça <intimacoes@tjsp.jus.br>',
        date: new Date().toISOString(),
        body: '<p>Informamos que houve uma nova movimentação no processo vinculado ao seu e-mail. Acesse o portal do tribunal para mais detalhes.</p>',
        snippet: 'Informamos que houve uma nova movimentação no processo...',
      },
      {
        id: 'mock-2',
        subject: 'Dúvida sobre contrato de honorários',
        from: 'João Silva <joao.silva@example.com>',
        date: new Date(Date.now() - 3600000).toISOString(),
        body: '<p>Prezado advogado,<br><br>Gostaria de tirar uma dúvida sobre a cláusula 4 do nosso contrato de honorários. Podemos agendar uma reunião rápida amanhã?</p><p>Atenciosamente,<br>João</p>',
        snippet:
          'Prezado advogado, gostaria de tirar uma dúvida sobre a cláusula 4 do nosso contrato...',
      },
      {
        id: 'mock-3',
        subject: 'Documentação pendente - Alvará',
        from: 'Maria Souza <maria.souza@empresa.com.br>',
        date: new Date(Date.now() - 86400000).toISOString(),
        body: '<p>Bom dia,<br><br>Segue em anexo a documentação solicitada para o pedido de alvará. Qualquer dúvida estou à disposição.</p>',
        snippet: 'Bom dia, Segue em anexo a documentação solicitada para o pedido de alvará.',
      },
    ]

    return e.json(200, messages)
  },
  $apis.requireAuth(),
)
