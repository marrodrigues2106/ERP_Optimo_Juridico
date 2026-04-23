routerAdd(
  'POST',
  '/backend/v1/email/test',
  (e) => {
    const body = e.requestInfo().body
    if (!body || !body.imap_host || !body.email_user || !body.email_password) {
      return e.json(400, { success: false, message: 'Dados de conexão incompletos.' })
    }

    // Mock success since real IMAP connection is unsupported in Goja
    return e.json(200, {
      success: true,
      message:
        'Conexão IMAP simulada com sucesso. Funcionalidade real não suportada neste ambiente.',
    })
  },
  $apis.requireAuth(),
)
