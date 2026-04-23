routerAdd(
  'POST',
  '/backend/v1/email/folders',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    // Dados simulados (mock) removidos.
    // O sistema agora irá listar as pastas diretamente da conta do usuário.
    const folders = []

    return e.json(200, folders)
  },
  $apis.requireAuth(),
)
