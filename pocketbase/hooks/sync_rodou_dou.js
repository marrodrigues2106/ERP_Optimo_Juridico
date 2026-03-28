cronAdd('sync_rodou_dou', '0 4 * * *', () => {
  let configs
  try {
    configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
  } catch (e) {
    return
  }

  if (configs.length === 0) return
  const config = configs[0]

  try {
    const douCreds = config.get('douCredentials') || {}
    const username = douCreds.username || $secrets.get('INLABS_USERNAME')
    const password = douCreds.password || $secrets.get('INLABS_PASSWORD')

    const terms = $app.findRecordsByFilter(
      'monitoring_terms',
      "active = true && type = 'DOU'",
      '',
      1000,
      0,
    )
    if (terms.length === 0) return

    if (!username || !password) {
      throw new Error('Missing DOU/Inlabs credentials in config or secrets')
    }

    const today = new Date().toISOString().split('T')[0]

    // Simulated call to the external Inlabs/Ro-DOU adapter
    const res = $http.send({
      url: 'https://api.inlabs.com.br/v1/search/dou',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username,
        password: password,
        terms: terms.map((t) => t.getString('term')),
        date: today,
      }),
      timeout: 45,
    })

    if (res.statusCode === 200 && res.json && res.json.results) {
      for (let match of res.json.results) {
        const matchedTermRec = terms.find((t) => t.getString('term') === match.term)
        if (!matchedTermRec) continue
        const userId = matchedTermRec.getString('user')
        if (!userId) continue

        let lawsuitId = ''
        const excerpt = match.excerpt || `Termo encontrado no DOU: ${match.term}`

        const cnjMatch = excerpt.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/)
        if (cnjMatch) {
          try {
            const ls = $app.findFirstRecordByFilter('lawsuits', `number = {:num}`, {
              num: cnjMatch[0],
            })
            if (ls) lawsuitId = ls.id
          } catch (e) {}
        }

        try {
          const existing = $app.findFirstRecordByFilter(
            'lawsuit_notifications',
            `user = {:u} && discovered_data LIKE {:url}`,
            { u: userId, url: `%${match.url}%` },
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
          source: `DOU - Seção ${match.section || '1'}`,
          date: match.date || today,
          page: match.page || 1,
          url: match.url || 'https://www.in.gov.br/',
        })

        $app.save(notif)
      }
    }

    config.set('gazetteLastSync', new Date().toISOString())
    config.set('gazetteLastError', '')
    $app.save(config)
  } catch (err) {
    config.set('gazetteLastError', 'Ro-DOU Sync Error: ' + String(err))
    $app.save(config)
  }
})
