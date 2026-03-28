cronAdd('sync_querido_diario', '0 2 * * *', () => {
  let configs
  try {
    configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
  } catch (e) {
    return
  }

  if (configs.length === 0) return
  const config = configs[0]

  try {
    let apiKey =
      config.getString('queridoDiarioToken') || $secrets.get('QUERIDO_DIARIO_TOKEN') || ''

    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const publishedSince = yesterday.toISOString().split('T')[0]

    const terms = $app.findRecordsByFilter(
      'monitoring_terms',
      "active = true && (type = 'Municipal' || type = 'State')",
      '',
      1000,
      0,
    )

    for (let termRec of terms) {
      const term = termRec.getString('term')
      const userId = termRec.getString('user')
      if (!userId) continue

      try {
        const headers = { Accept: 'application/json' }
        if (apiKey) {
          headers['Authorization'] = 'Bearer ' + apiKey
        }

        const res = $http.send({
          url: `https://queridodiario.ok.org.br/api/gazettes?querystring=${encodeURIComponent(term)}&published_since=${publishedSince}`,
          method: 'GET',
          headers: headers,
          timeout: 45,
        })

        if (res.statusCode === 200 && res.json && res.json.gazettes) {
          for (let g of res.json.gazettes) {
            let lawsuitId = ''
            const excerpt = g.excerpt || ''

            // Attempt to match standard CNJ lawsuit number structure
            const match = excerpt.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/)
            if (match) {
              try {
                const lawsuit = $app.findFirstRecordByFilter('lawsuits', `number = {:num}`, {
                  num: match[0],
                })
                if (lawsuit) lawsuitId = lawsuit.id
              } catch (e) {}
            }

            // Check if notification already exists to avoid duplicates
            try {
              const existing = $app.findFirstRecordByFilter(
                'lawsuit_notifications',
                `user = {:u} && discovered_data LIKE {:url}`,
                { u: userId, url: `%${g.url}%` },
              )
              if (existing) continue
            } catch (e) {}

            const notif = new Record($app.findCollectionByNameOrId('lawsuit_notifications'))
            notif.set('type', 'gazette')
            notif.set(
              'update_content',
              excerpt.length > 500 ? excerpt.substring(0, 497) + '...' : excerpt,
            )
            notif.set('user', userId)
            if (lawsuitId) notif.set('lawsuit', lawsuitId)
            notif.set('is_read', false)
            notif.set('discovered_data', {
              url: g.url,
              territory_name: g.territory_name,
              state_code: g.state_code,
              date: g.date,
              source: `Diário Oficial - ${g.territory_name || 'BR'}/${g.state_code || ''}`,
            })

            $app.save(notif)
          }
        }
      } catch (err) {
        console.log('Error syncing Querido Diário for term:', term, err)
      }
    }

    config.set('gazetteLastSync', new Date().toISOString())
    config.set('gazetteLastError', '')
    $app.save(config)
  } catch (err) {
    config.set('gazetteLastError', 'Querido Diário Sync Error: ' + String(err))
    $app.save(config)
  }
})
