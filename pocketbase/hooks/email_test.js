routerAdd(
  'POST',
  '/backend/v1/email/test',
  (e) => {
    const body = e.requestInfo().body || {}

    const imapHost = (body.imap_host || '').trim()
    const smtpHost = (body.smtp_host || '').trim()
    const emailUser = (body.email_user || '').trim()
    const emailPass = (body.email_password || '').trim()
    const encryption = body.email_encryption

    if (!imapHost || !smtpHost || !emailUser || !emailPass) {
      return e.badRequestError(
        'Credenciais de e-mail incompletas ou incorretas. Por favor, configure seu perfil.',
      )
    }

    // Log simulated test
    $app.logger().info('Simulated email test', 'user', emailUser, 'encryption', encryption)

    return e.json(200, { success: true, message: `Conexão (${encryption}) simulada com sucesso.` })
  },
  $apis.requireAuth(),
)
