routerAdd(
  'POST',
  '/backend/v1/sync/dou',
  (e) => {
    try {
      const col = $app.findCollectionByNameOrId('logs_processamento')
      const log = new Record(col)
      log.set('etapa', 'Sincronização Manual')
      log.set('status', 'Iniciado')
      log.set('mensagem', 'Sincronização manual do DOU acionada via painel.')
      log.set('data_hora', new Date().toISOString())
      $app.save(log)

      $app.logger().info('Manual DOU sync triggered via UI')

      try {
        $http.send({
          url: 'http://127.0.0.1:8090/backend/v1/cron/dou',
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
