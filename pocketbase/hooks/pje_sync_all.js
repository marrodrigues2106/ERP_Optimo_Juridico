routerAdd(
  'POST',
  '/backend/v1/processos-sync-pje-all',
  (e) => {
    const orgId = e.auth?.getString('active_organization')
    if (!orgId) throw new BadRequestError('Organização não definida')

    $app
      .db()
      .newQuery(`
      UPDATE legal_cases
      SET pje_sync_status = 'pending'
      WHERE lifecycle_status = 'Ativo'
        AND organization = {:org}
        AND pje_sync_status != 'syncing'
        AND pje_sync_status != 'pending'
    `)
      .bind({ org: orgId })
      .execute()

    return e.json(200, {
      success: true,
      message: 'Sincronização agendada para todos os processos ativos.',
    })
  },
  $apis.requireAuth(),
)
