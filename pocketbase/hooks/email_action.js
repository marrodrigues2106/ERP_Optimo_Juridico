routerAdd(
  'POST',
  '/backend/v1/email/action',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const body = e.requestInfo().body || {}

    const errors = {}
    if (!body.action) errors.action = new ValidationError('required', 'Ação é obrigatória')
    if (!body.messageIds || !Array.isArray(body.messageIds)) {
      errors.messageIds = new ValidationError('required', 'Lista de mensagens é obrigatória')
    }

    if (Object.keys(errors).length > 0) {
      throw new BadRequestError('Dados inválidos para a ação.', errors)
    }

    return e.json(200, { success: true, action: body.action, messageIds: body.messageIds })
  },
  $apis.requireAuth(),
)
