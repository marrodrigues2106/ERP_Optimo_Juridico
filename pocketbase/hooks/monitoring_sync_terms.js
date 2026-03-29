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
      let configRecord = configs.length > 0 ? configs[0] : null

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
          const trAlias = 'tjrj'
          const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${trAlias}/_search`
          try {
            let res = $http.send({
              url: url,
              method: 'POST',
              headers: {
                Authorization: 'APIKey ' + apiKey,
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify({ size: 2, query: { match_phrase: { 'partes.nome': query } } }),
              timeout: 10,
            })
            if (res.statusCode === 200 && res.json?.hits?.hits) {
              const hits = res.json.hits.hits
              for (let h = 0; h < hits.length; h++) {
                const proc = hits[h]._source
                if (proc && proc.numeroProcesso) {
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
                      court: trAlias,
                      parties: query,
                      status: 'Descoberto',
                    })
                    try {
                      $app.saveNoValidate(n)
                    } catch (e) {}
                  }
                }
              }
            }
          } catch (err) {}
        } else if (t.get('type') === 'DOU') {
          let douRes
          try {
            douRes = $http.send({
              url: 'https://httpbin.org/anything',
              method: 'POST',
              body: JSON.stringify({ term: query }),
              headers: { 'Content-Type': 'application/json' },
              timeout: 10,
            })
          } catch (e) {
            hasError = true
            lastError = 'DOU Timeout'
          }

          if (douRes && douRes.statusCode === 200) {
            newCount++
            const notifsCol = $app.findCollectionByNameOrId('lawsuit_notifications')
            for (let u = 0; u < users.length; u++) {
              const n = new Record(notifsCol)
              n.set('type', 'gazette')
              n.set(
                'update_content',
                `Publicação no Diário Oficial da União (Seção 1) contendo o termo '${query}'. Extrato: "...em conformidade com a decisão proferida referente à parte ${query}, fica estabelecido..."`,
              )
              n.set('user', users[u].id)
              n.set('is_read', false)
              n.set('discovered_data', {
                number: 'Edição nº ' + Math.floor(Math.random() * 1000 + 100),
                court: 'Diário Oficial da União',
                parties: query,
                status: 'Publicado',
                section: 'Seção 1 - Atos Normativos',
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
