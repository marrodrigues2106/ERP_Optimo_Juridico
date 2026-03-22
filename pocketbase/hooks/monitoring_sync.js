routerAdd(
  'POST',
  '/backend/v1/monitoring/sync-terms',
  (e) => {
    try {
      const terms = $app.findRecordsByFilter('monitoring_terms', 'active = true', '', 100, 0)
      const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
      const apiKey = configs.length > 0 ? configs[0].get('apiKey') : null

      if (!apiKey) {
        return e.json(400, { error: 'API Key not configured' })
      }

      let users = []
      try {
        users = $app.findRecordsByFilter('users', '1=1', '', 100, 0)
      } catch (err) {}

      let newCount = 0

      for (let i = 0; i < terms.length; i++) {
        const t = terms[i]
        if (t.get('type') === 'DataJud') {
          const query = t.get('term')
          // Elasticsearch query using match_phrase for the provided term
          const bodyObj = {
            size: 10,
            query: {
              match_phrase: { 'movimentos.nome': query },
            },
          }

          let res
          try {
            res = $http.send({
              url: 'https://api-publica.datajud.cnj.jus.br/api_publica_stj/_search',
              method: 'POST',
              headers: {
                Authorization: 'APIKey ' + apiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(bodyObj),
              timeout: 15,
            })

            if (res.statusCode === 200 && res.json && res.json.hits && res.json.hits.hits) {
              const hits = res.json.hits.hits
              for (let h = 0; h < hits.length; h++) {
                const proc = hits[h]._source
                if (proc && proc.numeroProcesso) {
                  // Check if the process is already registered
                  let exists = false
                  try {
                    $app.findFirstRecordByFilter('lawsuits', `number ~ '${proc.numeroProcesso}'`)
                    exists = true
                  } catch (err) {}

                  if (!exists) {
                    // Check if a notification already exists for this discovery
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

                      // Dispatch alert to all system users
                      for (let u = 0; u < users.length; u++) {
                        const n = new Record(notifsCol)
                        n.set('type', 'discovery')
                        n.set(
                          'update_content',
                          `Novo processo encontrado via termo '${query}': ${proc.numeroProcesso}`,
                        )
                        n.set('user', users[u].id)
                        n.set('is_read', false)
                        n.set('discovered_data', {
                          number: proc.numeroProcesso,
                          court: proc.orgaoJulgador?.nomeOrgao || 'STJ',
                          parties: 'Partes não identificadas',
                          status: 'Descoberto',
                        })
                        $app.saveNoValidate(n)
                      }
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.log('Error syncing term: ', query, err)
          }
        }
      }

      return e.json(200, { success: true, discovered: newCount })
    } catch (err) {
      return e.json(500, { error: String(err) })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/monitoring/sync-processes',
  (e) => {
    try {
      const processes = $app.findRecordsByFilter('lawsuits', "status != 'Encerrado'", '', 100, 0)
      let count = 0
      for (let i = 0; i < processes.length; i++) {
        const p = processes[i]
        if (p.get('number')) {
          // Queue the process for sync
          p.set('datajudStatus', 'Sync Requested')
          $app.saveNoValidate(p)
          count++
        }
      }
      return e.json(200, { success: true, count: count })
    } catch (err) {
      return e.json(500, { error: String(err) })
    }
  },
  $apis.requireAuth(),
)
