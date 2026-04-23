routerAdd(
  'POST',
  '/backend/v1/email/folders',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const host = user.getString('imap_host')
    const emailUser = user.getString('email_user')
    const password = user.getString('email_encrypted_password')

    if (!host || !emailUser || !password) {
      return e.badRequestError('Configurações de IMAP incompletas no perfil do usuário.')
    }

    // Mock data since native Node.js TCP/TLS modules (imapflow) are not supported in JSVM
    const folders = [
      { id: 'INBOX', name: 'Caixa de Entrada', unread: 3, path: 'INBOX' },
      { id: 'Sent', name: 'Enviados', unread: 0, path: 'Sent' },
      { id: 'Drafts', name: 'Rascunhos', unread: 0, path: 'Drafts' },
      { id: 'Trash', name: 'Lixeira', unread: 0, path: 'Trash' },
      { id: 'Spam', name: 'Spam', unread: 1, path: 'Spam' },
    ]

    return e.json(200, folders)
  },
  $apis.requireAuth(),
)
