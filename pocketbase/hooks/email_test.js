routerAdd(
  'POST',
  '/backend/v1/email/test',
  (e) => {
    const body = e.requestInfo().body || {}

    if (!body.smtp_host || !body.smtp_port || !body.email_user || !body.email_password) {
      return e.badRequestError('Credenciais SMTP incompletas.')
    }

    // Since native Node.js modules like 'net' and 'tls' are not available in the PocketBase JSVM,
    // we simulate a successful connection for demonstration purposes.
    return e.json(200, { success: true, message: 'Conexão simulada com sucesso.' })
  },
  $apis.requireAuth(),
)
