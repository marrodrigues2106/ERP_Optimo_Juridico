routerAdd(
  'POST',
  '/backend/v1/sync/dou',
  (e) => {
    try {
      $app.logger().info('Manual DOU sync triggered via UI')
    } catch (err) {
      console.log(err)
    }
    return e.json(200, { success: true, message: 'Sync started' })
  },
  $apis.requireAuth(),
)
