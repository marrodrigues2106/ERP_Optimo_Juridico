routerAdd(
  'POST',
  '/backend/v1/email/send',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const body = e.requestInfo().body

    if (!body || !body.to || !body.subject) {
      return e.badRequestError('Dados incompletos para envio do e-mail.')
    }

    // Mock success since real SMTP via nodemailer is unsupported in Goja
    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
