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

          const strategies = [
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
            {
              size: 10,
              query: {
                match_phrase: { 'partes.nome': query },
              },
            },
            {
              size: 10,
              query: {
                multi_match: {
                  query: query,
                  fields: ['partes.nome', 'movimentos.nome', 'orgaoJulgador.nomeOrgao'],
                },
              },
            },
          ]

          let hits = []

          for (let s = 0; s < strategies.length; s++) {
            let retryCount = 0
            let successReq = false

            while (retryCount < 2 && !successReq) {
              try {
                let res = $http.send({
                  url: 'https://api-publica.datajud.cnj.jus.br/api_publica_stj/_search',
                  method: 'POST',
                  headers: {
                    Authorization: 'APIKey ' + apiKey,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(strategies[s]),
                  timeout: 30, // 30s timeout resilient
                })

                successReq = true
                if (res.statusCode === 200 && res.json && res.json.hits && res.json.hits.hits) {
                  if (res.json.hits.hits.length > 0) {
                    hits = res.json.hits.hits
                    break
                  }
                }
              } catch (err) {
                retryCount++
                console.log('Error syncing term (timeout/network): ', query, err)
              }
            }
            if (hits.length > 0) break // found hits, break strategy loop
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
                      `Novo processo encontrado via termo '${query}': ${proc.numeroProcesso}`,
                    )
                    n.set('user', users[u].id)
                    n.set('is_read', false)
                    n.set('discovered_data', {
                      number: proc.numeroProcesso,
                      court:
                        proc.orgaoJulgador && proc.orgaoJulgador.nomeOrgao
                          ? proc.orgaoJulgador.nomeOrgao
                          : 'STJ',
                      parties: 'Partes identificadas na pesquisa',
                      status: 'Descoberto',
                    })
                    $app.saveNoValidate(n)
                  }
                }
              }
            }
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
