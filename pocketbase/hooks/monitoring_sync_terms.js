routerAdd(
  'POST',
  '/backend/v1/monitoring/sync-terms',
  (e) => {
    const start = Date.now()
    try {
      const terms = $app.findRecordsByFilter('monitoring_terms', 'active = true', '', 100, 0)
      const tribunals = $app.findRecordsByFilter('tribunals', 'active = true', '', 100, 0)
      const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)

      let apiKey = ''
      let configRecord = null

      if (configs.length > 0) {
        configRecord = configs[0]
        if (configRecord.get('apiKey')) {
          apiKey = configRecord.get('apiKey')
        }
      }

      if (!apiKey) {
        if (configRecord) {
          configRecord.set('lastError', 'Configuration Missing: API Key is not set')
          try {
            $app.saveNoValidate(configRecord)
          } catch (e) {}
        }
        return e.json(400, { error: 'Configuration Missing: API Key is not set' })
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
        const query = t.get('term')

        if (t.get('type') === 'DataJud') {
          const strategies = [
            { size: 10, query: { match_phrase: { 'partes.nome': query } } },
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

          for (let tr = 0; tr < tribunals.length; tr++) {
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
                      Accept: 'application/json',
                    },
                    body: JSON.stringify(strategies[s]),
                    timeout: 30, // Updated timeout
                  })

                  if (res.statusCode === 200 && res.json && res.json.hits && res.json.hits.hits) {
                    hits = res.json.hits.hits
                    successReq = true
                  } else if (res.statusCode === 401 || res.statusCode === 403) {
                    hasError = true
                    lastError = 'Authentication Error: Invalid or expired API Key'
                    successReq = true
                  } else if (res.statusCode === 404) {
                    hasError = true
                    lastError = 'Invalid Endpoint: Tribunal alias not recognized'
                    successReq = true
                  } else if (res.statusCode !== 200) {
                    hasError = true
                    lastError = 'HTTP Error: ' + res.statusCode
                  }
                } catch (err) {
                  retryCount++
                  hasError = true
                  const errStr = String(err).toLowerCase()
                  if (
                    errStr.includes('no such host') ||
                    errStr.includes('dns') ||
                    errStr.includes('resolve')
                  ) {
                    lastError = 'DNS Failure: Could not resolve host'
                  } else if (errStr.includes('timeout') || errStr.includes('deadline')) {
                    lastError = 'Connection Timeout: Server took too long to respond'
                  } else {
                    lastError = 'Network Failure: ' + String(err)
                  }
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
              if (hits.length > 0) break
            }
          }
        } else if (t.get('type') === 'DOU') {
          let douRes
          try {
            douRes = $http.send({ url: 'https://httpbin.org/get', method: 'GET', timeout: 10 })
          } catch (e) {
            hasError = true
            lastError = 'DOU Timeout'
          }

          if (douRes && douRes.statusCode === 200) {
            newCount++
            const notifsCol = $app.findCollectionByNameOrId('lawsuit_notifications')
            for (let u = 0; u < users.length; u++) {
              const n = new Record(notifsCol)
              n.set('type', 'discovery')
              n.set(
                'update_content',
                `Termo '${query}' encontrado em publicação do Diário Oficial da União (DOU).`,
              )
              n.set('user', users[u].id)
              n.set('is_read', false)
              n.set('discovered_data', {
                number: 'N/A (Descoberta em Diário)',
                court: 'Diários Oficiais',
                parties: query,
                status: 'Publicado',
              })
              try {
                $app.saveNoValidate(n)
              } catch (e) {}
            }
          }
        }
      }

      if (configRecord) {
        try {
          configRecord.set('lastLatency', Date.now() - start)
          if (hasError && newCount === 0) {
            configRecord.set('lastStatus', 0)
            configRecord.set('lastError', lastError)
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
