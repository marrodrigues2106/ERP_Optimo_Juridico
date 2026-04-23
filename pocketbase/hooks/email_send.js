routerAdd(
  'POST',
  '/backend/v1/email/send',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const body = e.requestInfo().body || {}

    const errors = {}
    if (!body.to) errors.to = new ValidationError('required', 'Destinatário é obrigatório')
    if (!body.subject) errors.subject = new ValidationError('required', 'Assunto é obrigatório')

    if (Object.keys(errors).length > 0) {
      throw new BadRequestError('Dados incompletos para envio do e-mail.', errors)
    }

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
