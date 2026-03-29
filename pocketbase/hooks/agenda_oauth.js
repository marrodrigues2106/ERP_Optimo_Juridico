routerAdd(
  'POST',
  '/backend/v1/agenda/oauth',
  (e) => {
    const body = e.requestInfo().body
    const provider = body.provider || 'Google'

    // Simulate an OAuth linking process
    console.log(`[Agenda] Linking ${provider} calendar for user ${e.auth?.id}`)

    return e.json(200, {
      success: true,
      message: `${provider} calendar linked successfully.`,
      sync_status: 'Active',
    })
  },
  $apis.requireAuth(),
)
