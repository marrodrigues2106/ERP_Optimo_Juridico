routerAdd(
  'POST',
  '/backend/v1/sync/pje',
  (e) => {
    try {
      $app.logger().info('Manual PJe sync triggered via UI')
    } catch (err) {
      console.log(err)
    }
    return e.json(200, { success: true, message: 'Sync started' })
  },
  $apis.requireAuth(),
)
