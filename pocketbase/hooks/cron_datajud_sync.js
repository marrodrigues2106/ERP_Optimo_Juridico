cronAdd('datajud_background_sync', '0 */2 * * *', () => {
  const start = Date.now()
  console.log('[DataJud] Starting background sync...')
  try {
    const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
    if (configs.length === 0) return
    const config = configs[0]

    if (!config.get('sync_processos')) return

    const apiKey = config.get('apiKey')
    if (!apiKey) return

    let monitoredTribunals = []
    try {
      const activeTribunals = $app.findRecordsByFilter('tribunals', 'active = true', '', 1000, 0)
      activeTribunals.forEach((t) => {
        let a = t.get('alias')
        if (a) monitoredTribunals.push(String(a).toLowerCase().trim())
      })
      const tList = config.get('tribunais') || []
      tList.forEach((t) => {
        if (t) monitoredTribunals.push(String(t).toLowerCase().trim())
      })
    } catch (e) {}

    const cases = $app.findRecordsByFilter(
      'legal_cases',
      "lifecycle_status = 'Ativo' && case_number != ''",
      'datajud_last_sync ASC',
      100,
      0,
    )

    let failCount = 0
    let successCount = 0
    let newMovementsCount = 0

    const caseMovementsCol = $app.findCollectionByNameOrId('case_movements')

    for (let c of cases) {
      try {
        let courtAlias = c.get('court_alias')
        if (courtAlias) {
          courtAlias = String(courtAlias).toLowerCase().replace('api_publica_', '').trim()
          if (monitoredTribunals.length > 0 && !monitoredTribunals.includes(courtAlias)) {
            continue
          }
        } else {
          courtAlias = 'tjrj'
        }

        const caseNumber = c.get('case_number').replace(/\D/g, '')
        if (!caseNumber) continue

        const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${courtAlias}/_search`

        const res = $http.send({
          url: url,
          method: 'POST',
          headers: {
            Authorization: 'APIKey ' + apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: {
              match: {
                numeroProcesso: caseNumber,
              },
            },
          }),
          timeout: 10,
        })

        if (res.statusCode === 200 && res.json && res.json.hits && res.json.hits.hits.length > 0) {
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
        } else {
          c.set('datajud_last_sync', new Date().toISOString())
          c.set('datajud_sync_status', 'not_found')
          $app.saveNoValidate(c)
          failCount++
        }
      } catch (err) {
        failCount++
      }
    }

    const latency = Date.now() - start
    config.set('datajudLastCheckAt', new Date().toISOString())
    if (failCount > 0) {
      config.set('datajudLastError', `${failCount} cases failed to sync.`)
      config.set('datajudStatus', 'warning')
    } else {
      config.set('datajudLastError', '')
      config.set('datajudStatus', 'online')
    }
    $app.saveNoValidate(config)

    const logsCol = $app.findCollectionByNameOrId('logs_processamento')
    const logRec = new Record(logsCol)
    logRec.set('etapa', 'Sincronização DataJud')
    logRec.set('status', failCount > 0 ? 'Aviso' : 'Sucesso')
    logRec.set(
      'mensagem',
      `Sync concluído em ${latency}ms. ${successCount} processos atualizados, ${failCount} falhas. ${newMovementsCount} novos movimentos encontrados.`,
    )
    logRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
    $app.save(logRec)
  } catch (err) {
    console.log('Cron datajud_sync error:', err)
  }
})
