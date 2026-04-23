routerAdd(
  'POST',
  '/backend/v1/email/inbox',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const body = e.requestInfo().body || {}
    const folder = body.folder || 'INBOX'
    const page = parseInt(body.page) || 1
    const limit = parseInt(body.limit) || 20
    const status = body.status || 'all'

    // Dados simulados (mock) foram removidos.
    // A integração real populando através do servidor IMAP deve alimentar a resposta.
    // Como a API não possui dados para a conta ainda, retornamos a lista limpa.
    return e.json(200, {
      items: [],
      totalItems: 0,
      page: page,
      perPage: limit,
      totalPages: 0,
    })
  },
  $apis.requireAuth(),
)
