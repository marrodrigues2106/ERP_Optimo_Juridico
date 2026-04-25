routerAdd(
  'POST',
  '/backend/v1/admin/purge-data',
  (e) => {
    if (!e.auth || (e.auth.getString('role') !== 'admin' && !e.auth.getBool('isAdmin'))) {
      return e.forbiddenError('Acesso negado. Apenas administradores podem executar esta ação.')
    }
    const orgId = e.auth.getString('active_organization')
    if (!orgId) return e.badRequestError('Nenhuma organização ativa encontrada para este usuário.')

    const body = e.requestInfo().body || {}
    const collectionsToPurge = body.collections || []

    const allowedCollections = ['crm_interactions', 'tasks', 'agenda_events']
    const toDelete = collectionsToPurge.filter((c) => allowedCollections.includes(c))

    if (toDelete.length === 0) {
      return e.badRequestError('Nenhuma coleção válida especificada para limpeza.')
    }

    let deletedCount = 0
    const errors = []

    toDelete.forEach((colName) => {
      try {
        const records = $app.findRecordsByFilter(
          colName,
          `organization = '${orgId}'`,
          '',
          100000,
          0,
        )
        records.forEach((record) => {
          try {
            $app.delete(record)
            deletedCount++
          } catch (err) {
            errors.push(`Falha ao excluir registro ${record.id} em ${colName}`)
          }
        })
      } catch (err) {
        errors.push(`Falha ao buscar registros para ${colName}`)
      }
    })

    return e.json(200, { success: true, deletedCount, errors })
  },
  $apis.requireAuth(),
)
