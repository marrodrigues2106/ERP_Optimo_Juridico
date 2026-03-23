routerAdd(
  'POST',
  '/backend/v1/monitoring/sync-terms',
  (e) => {
    const start = Date.now()
    try {
      const terms = $app.findRecordsByFilter('monitoring_terms', 'active = true', '', 100, 0)
      const tribunals = $app.findRecordsByFilter('tribunals', 'active = true', '', 100, 0)
      const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)

      let apiKey = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
      let configRecord = null

      if (configs.length > 0) {
        configRecord = configs[0]
        if (configRecord.get('apiKey')) {
          apiKey = configRecord.get('apiKey')
        }
      }

      let users = []
      try {
        users = $app.findRecordsByFilter('users', '1=1', '', 100, 0)
      } catch (err) {}

      let newCount = 0
      let hasError = false
      let lastError = ''

      for (let i = 0; i < terms.length; i++) {
        const t = terms[i]
        if (t.get('type') === 'DataJud') {
          const query = t.get('term')

          const strategies = [
            {
              size: 10,
              query: {
                match_phrase: { 'partes.nome': query },
              },
            },
            {
              size: 10,
              query: {
                bool: {
                  should: [
                    { term: { numeroProcesso: query } },
                    { term: { 'numeroProcesso.keyword': query } },
                  ],
                },
              },
            },
          ]

          // Iterate through all active tribunals for Global Term Search
          for (let tr = 0; tr < tribunals.length; tr++) {
            // Break early to prevent extreme execution times (e.g. 504 Gateway Timeout)
            if (Date.now() - start > 45000) break

            const alias = tribunals[tr].get('alias')
            const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`

            for (let s = 0; s < strategies.length; s++) {
              let retryCount = 0
              let successReq = false
              let hits = []

              while (retryCount < 2 && !successReq) {
                try {
                  let res = $http.send({
                    url: url,
                    method: 'POST',
                    headers: {
                      Authorization: 'APIKey ' + apiKey,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(strategies[s]),
                    timeout: 5, // Shorter timeout for term discovery to scan across 90 aliases efficiently
                  })

                  successReq = true
                  if (res.statusCode === 200 && res.json && res.json.hits && res.json.hits.hits) {
                    hits = res.json.hits.hits
                  } else if (res.statusCode !== 200) {
                    hasError = true
                    lastError = 'Status ' + res.statusCode
                  }
                } catch (err) {
                  retryCount++
                  hasError = true
                  lastError = String(err)
                }
              }

              for (let h = 0; h < hits.length; h++) {
                const proc = hits[h]._source
                if (proc && proc.numeroProcesso) {
                  let exists = false
                  try {
                    $app.findFirstRecordByFilter('lawsuits', `number ~ '${proc.numeroProcesso}'`)
                    exists = true
                  } catch (err) {}

                  if (!exists) {
                    let notifExists = false
                    try {
                      $app.findFirstRecordByFilter(
                        'lawsuit_notifications',
                        `update_content ~ '${proc.numeroProcesso}' && type = 'discovery'`,
                      )
                      notifExists = true
                    } catch (err) {}

                    if (!notifExists) {
                      newCount++
                      const notifsCol = $app.findCollectionByNameOrId('lawsuit_notifications')

                      for (let u = 0; u < users.length; u++) {
                        const n = new Record(notifsCol)
                        n.set('type', 'discovery')
                        n.set(
                          'update_content',
                          `Novo processo encontrado via termo '${query}' no tribunal ${alias.toUpperCase()}: ${
                            proc.numeroProcesso
                          }`,
                        )
                        n.set('user', users[u].id)
                        n.set('is_read', false)
                        n.set('discovered_data', {
                          number: proc.numeroProcesso,
                          court:
                            proc.orgaoJulgador && proc.orgaoJulgador.nomeOrgao
                              ? proc.orgaoJulgador.nomeOrgao
                              : alias.toUpperCase(),
                          parties: 'Partes identificadas na pesquisa',
                          status: 'Descoberto',
                        })
                        $app.saveNoValidate(n)
                      }
                    }
                  }
                }
              }
              if (hits.length > 0) break // Skip other strategies if found hits on this tribunal
            }
          }
        }
      }

      if (configRecord) {
        try {
          configRecord.set('lastLatency', Date.now() - start)
          if (hasError && newCount === 0) {
            configRecord.set('lastStatus', 0)
            configRecord.set('lastError', 'Algumas requisições falharam: ' + lastError)
          } else {
            configRecord.set('lastStatus', 200)
            configRecord.set('lastError', '')
          }
          $app.saveNoValidate(configRecord)
        } catch (e) {}
      }

      return e.json(200, { success: true, discovered: newCount })
    } catch (err) {
      return e.json(500, { error: String(err) })
    }
  },
  $apis.requireAuth(),
)
