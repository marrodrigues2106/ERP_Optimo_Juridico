routerAdd(
  'POST',
  '/backend/v1/monitoring/sync-processes',
  (e) => {
    const start = Date.now()
    try {
      const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
      if (configs.length === 0) return e.json(400, { error: 'No config' })
      const config = configs[0]
      const apiKey = config.get('apiKey')
      if (!apiKey) return e.json(400, { error: 'No API Key' })

      const cases = $app.findRecordsByFilter(
        'legal_cases',
        "lifecycle_status = 'Ativo' && case_number != ''",
        'datajud_last_sync',
        10,
        0,
      )

      let successCount = 0
      let newMovementsCount = 0
      const caseMovementsCol = $app.findCollectionByNameOrId('case_movements')

      for (let c of cases) {
        try {
          let courtAlias = c.get('court_alias') || 'tjrj'
          courtAlias = String(courtAlias).toLowerCase().replace('api_publica_', '').trim()
          const caseNumber = c.get('case_number').replace(/\D/g, '')
          if (!caseNumber) continue

          const res = $http.send({
            url: `https://api-publica.datajud.cnj.jus.br/api_publica_${courtAlias}/_search`,
            method: 'POST',
            headers: { Authorization: 'APIKey ' + apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: { match: { numeroProcesso: caseNumber } } }),
            timeout: 10,
          })

          if (res.statusCode === 200 && res.json?.hits?.hits?.length > 0) {
            const proc = res.json.hits.hits[0]._source
            const movimentos = proc.movimentos || []
            for (let mov of movimentos) {
              const extId = `datajud_${caseNumber}_${mov.codigo}_${mov.dataHora}`
              try {
                $app.findFirstRecordByData('case_movements', 'external_id', extId)
              } catch (_) {
                const movRec = new Record(caseMovementsCol)
                movRec.set('case', c.id)
                movRec.set('event_date', mov.dataHora)
                movRec.set('description', mov.nome || 'Movimentação DataJud')
                movRec.set('source', 'DataJud')
                movRec.set('external_id', extId)
                movRec.set('details', JSON.stringify(mov))
                movRec.set('organization', c.get('organization'))
                $app.save(movRec)
                newMovementsCount++
              }
            }
            c.set('datajud_last_sync', new Date().toISOString())
            c.set('datajud_sync_status', 'success')
            $app.saveNoValidate(c)
            successCount++
          }
        } catch (e) {}
      }

      const logsCol = $app.findCollectionByNameOrId('logs_processamento')
      const logRec = new Record(logsCol)
      logRec.set('etapa', 'Sincronização Manual DataJud')
      logRec.set('status', 'Sucesso')
      logRec.set(
        'mensagem',
        `Sincronização manual (10 processos). ${successCount} concluídos. ${newMovementsCount} novos movimentos encontrados em ${Date.now() - start}ms.`,
      )
      logRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
      $app.save(logRec)

      return e.json(200, { success: true, updated: successCount, newMovements: newMovementsCount })
    } catch (err) {
      return e.json(500, { error: String(err) })
    }
  },
  $apis.requireAuth(),
)
