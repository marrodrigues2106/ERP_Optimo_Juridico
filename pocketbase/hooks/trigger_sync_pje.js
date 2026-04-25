routerAdd(
  'POST',
  '/backend/v1/sync/pje',
  (e) => {
    try {
      const orgId = e.auth?.get('active_organization')

      const col = $app.findCollectionByNameOrId('system_logs')
      const log = new Record(col)
      log.set('level', 'info')
      log.set('module', 'PJe Sync')
      log.set('message', 'Sincronização manual do PJe acionada via painel.')
      if (orgId) log.set('organization', orgId)
      if (e.auth?.id) log.set('user', e.auth.id)
      $app.save(log)

      $app.logger().info('Manual PJe sync triggered via UI')

      try {
        $http.send({
          url: 'http://127.0.0.1:8090/backend/v1/cron/pje',
          method: 'POST',
          timeout: 1,
        })
      } catch (err) {}
    } catch (err) {
      console.log(err)
      return e.internalServerError('Erro ao iniciar sincronização.')
    }
    return e.json(200, { success: true, message: 'Sync started' })
  },
  $apis.requireAuth(),
)
