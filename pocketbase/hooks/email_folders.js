routerAdd(
  'GET',
  '/backend/v1/email/folders',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    // Mock structured folder hierarchy with counts
    const folders = [
      { id: 'INBOX', name: 'Caixa de Entrada', unread: 21 },
      { id: 'Drafts', name: 'Rascunhos', unread: 0 },
      { id: 'Sent', name: 'Enviados', unread: 0 },
      { id: 'Spam', name: 'Lixo Eletrônico', unread: 4 },
      { id: 'Trash', name: 'Lixeira', unread: 0 },
      { id: 'Archive', name: 'Arquivo', unread: 0 },
      { id: 'Custom1', name: 'Processos Importantes', unread: 5 },
      { id: 'Custom2', name: 'Clientes VIP', unread: 0 },
    ]

    return e.json(200, folders)
  },
  $apis.requireAuth(),
)
