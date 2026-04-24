cronAdd('pje_sync_daily', '0 2 * * *', () => {
  const cases = $app.findRecordsByFilter(
    'legal_cases',
    "lifecycle_status = 'Ativo' && case_number != ''",
    '',
    100,
    0,
  )
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i]
    const cleanNumber = (c.getString('case_number') || '').replace(/\D/g, '')
    if (cleanNumber.length === 20) {
      try {
        const res = $http.send({
          url: 'https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=' + cleanNumber,
          method: 'GET',
          timeout: 15,
        })

        if (res.statusCode === 200 && res.json && res.json.items) {
          let newMovements = 0
          for (const item of res.json.items) {
            const extId = 'pje_' + (item.id || item.numeroComunicacao || item.hash)
            try {
              $app.findFirstRecordByData('case_movements', 'external_id', extId)
            } catch (_) {
              const mov = new Record($app.findCollectionByNameOrId('case_movements'))
              mov.set('case', c.id)
              mov.set('event_date', item.dataDisponibilizacao || new Date().toISOString())
              mov.set('description', item.tipoComunicacao || 'Comunicação PJe (Automático)')
              mov.set('source', 'PJe')
              mov.set('external_id', extId)
              mov.set('details', item.texto || '')
              mov.set('organization', c.get('organization'))
              mov.set('movement_details', item)
              if (item.link || item.url) mov.set('external_link', item.link || item.url)
              $app.save(mov)
              newMovements++
            }
          }
          c.set('sync_status', 'updated')
          c.set('last_sync_attempt', new Date().toISOString())
          $app.saveNoValidate(c)

          if (newMovements > 0) {
            $app.logger().info(`Synced ${newMovements} new PJe movements for case ${cleanNumber}`)
          }
        }
      } catch (err) {
        $app
          .logger()
          .error('PJe cron sync failed', 'case', c.getString('case_number'), 'error', err.message)
      }
    }
  }
})
