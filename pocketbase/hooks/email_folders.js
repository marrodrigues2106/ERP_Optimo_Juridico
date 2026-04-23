routerAdd(
  'GET',
  '/backend/v1/email/folders',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    // Mock folders since real IMAP is unsupported in Goja
    const folders = [
      { id: 'INBOX', name: 'Caixa de Entrada', unread: 1 },
      { id: 'Sent', name: 'Enviados', unread: 0 },
      { id: 'Drafts', name: 'Rascunhos', unread: 0 },
      { id: 'Trash', name: 'Lixeira', unread: 0 },
      { id: 'Spam', name: 'Spam', unread: 0 },
    ]

    return e.json(200, folders)
  },
  $apis.requireAuth(),
)
