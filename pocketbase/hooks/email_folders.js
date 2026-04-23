routerAdd(
  'GET',
  '/backend/v1/email/folders',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const imapHost = user.getString('imap_host')
    const emailUser = user.getString('email_user')
    const encryptedPass = user.getString('email_encrypted_password')

    if (!imapHost || !emailUser || !encryptedPass) {
      return e.badRequestError(
        'Credenciais de e-mail incompletas ou incorretas. Por favor, configure seu perfil.',
      )
    }

    const folders = [
      { id: 'INBOX', name: 'Caixa de entrada', unread: 3 },
      { id: 'Sent', name: 'Enviados', unread: 0 },
      { id: 'Outbox', name: 'Caixa de saída', unread: 0 },
      { id: 'Drafts', name: 'Rascunho', unread: 1 },
      { id: 'Spam', name: 'Spam', unread: 5 },
      { id: 'Trash', name: 'Lixeira', unread: 0 },
    ]

    return e.json(200, folders)
  },
  $apis.requireAuth(),
)
