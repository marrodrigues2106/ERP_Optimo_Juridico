routerAdd(
  'GET',
  '/backend/v1/email/inbox',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    // Since PocketBase JSVM (Goja) does not support Node.js built-ins like net/tls required for IMAP,
    // we return mock data so the UI remains functional for demonstration purposes.
    const mockMessages = [
      {
        id: 'mock-1',
        subject: 'Atualização do Processo 12345-67.2023.8.26.0000',
        from: 'notificacoes@tjsp.jus.br',
        date: new Date().toISOString(),
        body: '<p>Houve uma nova movimentação no processo.</p>',
        snippet: 'Houve uma nova movimentação no processo.',
        read: false,
      },
      {
        id: 'mock-2',
        subject: 'Documentos para o contrato de locação',
        from: 'cliente@exemplo.com.br',
        date: new Date(Date.now() - 86400000).toISOString(),
        body: '<p>Segue em anexo os documentos solicitados para a elaboração do contrato.</p>',
        snippet: 'Segue em anexo os documentos solicitados...',
        read: true,
      },
      {
        id: 'mock-3',
        subject: 'Dúvida sobre andamento',
        from: 'contato@empresa.com',
        date: new Date(Date.now() - 172800000).toISOString(),
        body: '<p>Olá, gostaria de saber se há alguma novidade no meu caso.</p>',
        snippet: 'Olá, gostaria de saber se há alguma novidade...',
        read: true,
      },
    ]

    return e.json(200, mockMessages)
  },
  $apis.requireAuth(),
)
