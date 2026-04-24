cronAdd('dou_ingestion', '0 3 * * *', () => {
  try {
    $app.logger().info('DOU Ingestion trigger running to verify monitored terms.')
    const terms = $app.findRecordsByFilter('termos_monitorados', 'ativo = true', '', 500, 0)
    $app.logger().info(`Found ${terms.length} active monitoring terms.`)
  } catch (err) {
    $app.logger().error('DOU cron ingestion failed', 'error', err.message)
  }
})
