routerAdd(
  'GET',
  '/backend/v1/email/inbox',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const folder = e.request.url.query().get('folder') || 'INBOX'
    const page = parseInt(e.request.url.query().get('page')) || 1
    const limit = parseInt(e.request.url.query().get('limit')) || 20
    const status = e.request.url.query().get('status') || 'all'

    // Mock an external service integration for email syncing
    const mockMessages = []

    // Generate deterministic messages to simulate persistence
    const total = folder === 'INBOX' ? 65 : folder === 'Sent' ? 25 : folder === 'Trash' ? 8 : 12
    for (let i = 1; i <= total; i++) {
      const isRead = i % 3 !== 0
      if (status === 'unread' && isRead) continue
      if (status === 'read' && !isRead) continue

      mockMessages.push({
        id: `msg-${folder}-${i}`,
        subject: `Mensagem ${i} - Atualização Importante`,
        from: i % 2 === 0 ? `cliente${i}@exemplo.com` : `sistema@tribunal.jus.br`,
        to: user.getString('email'),
        date: new Date(Date.now() - i * 43200000).toISOString(),
        body: `<p>Olá,</p><p>Esta é uma mensagem simulada número ${i} sincronizada da pasta <b>${folder}</b> via nossa nova integração de serviços de e-mail.</p><p>Atenciosamente,</p>`,
        snippet: `Olá, Esta é uma mensagem simulada número ${i} sincronizada da pasta...`,
        read: isRead,
        folder: folder,
      })
    }

    const start = (page - 1) * limit
    const end = start + limit
    const paginated = mockMessages.slice(start, end)

    return e.json(200, {
      items: paginated,
      totalItems: mockMessages.length,
      page: page,
      perPage: limit,
      totalPages: Math.ceil(mockMessages.length / limit),
    })
  },
  $apis.requireAuth(),
)
