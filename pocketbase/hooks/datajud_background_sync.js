routerAdd('POST', '/backend/v1/datajud/background-sync/{id}', (e) => {
  try {
    const body = e.requestInfo().body || {}
    if (body.secret !== 'internal-async-trigger') return e.forbiddenError('Forbidden')

    const id = e.request.pathValue('id')
    const record = $app.findRecordById('lawsuits', id)

    const getSafeLogs = (rec) => {
      let raw = rec.get('trackingLogs')
      if (!raw) return []
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw)
          return Array.isArray(parsed) ? parsed : []
        } catch (err) {
          return []
        }
      }
      if (Array.isArray(raw)) return raw
      try {
        const parsed = JSON.parse(JSON.stringify(raw))
        return Array.isArray(parsed) ? parsed : []
      } catch (err) {
        return []
      }
    }

    const addErrorLog = (rec, message) => {
      let existingLogs = getSafeLogs(rec)
      existingLogs.push({
        date: new Date().toISOString(),
        description: message,
        isManual: false,
        complementos: [],
      })
      rec.set('trackingLogs', existingLogs)
    }

    const getCourtAliasFromName = (courtStr) => {
      if (!courtStr) return null
      const cleanStr = String(courtStr)
        .toLowerCase()
        .replace(/[\/\-\s.,]/g, '')
      const regex =
        /(stf|stj|tst|tse|stm|cnj|tj[a-z]{2}|tjmmg|tjmrs|tjmsp|trf[0-9]+|trt[0-9]+|tre[a-z]{2})/
      const match = cleanStr.match(regex)
      if (match) return match[0]
      return cleanStr.replace(/[^a-z0-9]/g, '')
    }

    const getCourtAliasFromNumber = (numStr) => {
      if (!numStr) return null
      const cleanNum = String(numStr).replace(/\D/g, '')
      if (cleanNum.length !== 20) return null

      const j = cleanNum.substring(13, 14)
      const tr = cleanNum.substring(14, 16)

      if (j === '4') return 'trf' + parseInt(tr, 10)
      if (j === '5') return 'trt' + parseInt(tr, 10)
      if (j === '8') {
        const stateMap = {
          1: 'tjac',
          2: 'tjal',
          3: 'tjap',
          4: 'tjam',
          5: 'tjba',
          6: 'tjce',
          7: 'tjdft',
          8: 'tjes',
          9: 'tjgo',
          10: 'tjma',
          11: 'tjmt',
          12: 'tjms',
          13: 'tjmg',
          14: 'tjpa',
          15: 'tjpb',
          16: 'tjpr',
          17: 'tjpe',
          18: 'tjpi',
          19: 'tjrj',
          20: 'tjrn',
          21: 'tjrs',
          22: 'tjro',
          23: 'tjrr',
          24: 'tjsc',
          25: 'tjse',
          26: 'tjsp',
          27: 'tjto',
        }
        return stateMap[parseInt(tr, 10)] || null
      }
      if (j === '1') return 'stf'
      if (j === '2') return 'cnj'
      if (j === '3') return 'stj'
      if (j === '6') return 'tse'
      if (j === '7') return 'stm'

      return null
    }

    let success = false
    try {
      const num = record.get('number') || ''
      const cleanNum = String(num).replace(/\D/g, '')

      if (cleanNum.length !== 20) {
        record.set('datajudStatus', 'Sync Failed')
        addErrorLog(
          record,
          'Falha na sincronização: Número do processo inválido (' +
            cleanNum +
            '). O número deve conter 20 dígitos.',
        )
      } else {
        let alias = null
        const courtName = record.get('court')

        if (courtName) alias = getCourtAliasFromName(courtName)
        if (!alias) alias = getCourtAliasFromNumber(cleanNum)

        if (!alias) {
          record.set('datajudStatus', 'Sync Failed')
          addErrorLog(
            record,
            'Falha na sincronização: Não foi possível identificar o tribunal (Órgão) pelo nome ou número.',
          )
        } else {
          let tribunalIsActive = true
          try {
            const tribunalRecord = $app.findFirstRecordByFilter('tribunals', `alias = '${alias}'`)
            if (tribunalRecord) {
              tribunalIsActive = tribunalRecord.get('active')
            }
          } catch (e) {}

          if (!tribunalIsActive) {
            record.set('datajudStatus', 'Sync Failed')
            addErrorLog(
              record,
              `Falha na sincronização: O tribunal '${alias}' está desativado nas configurações.`,
            )
          } else {
            const url = 'https://api-publica.datajud.cnj.jus.br/api_publica_' + alias + '/_search'
            const pageSize = 100

            let apiKey = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
            try {
              const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
              if (configs.length > 0 && configs[0].get('apiKey')) {
                apiKey = configs[0].get('apiKey')
              }
            } catch (err) {}

            const strategies = [
              { query: { term: { 'numeroProcesso.keyword': cleanNum } } },
              { query: { term: { numeroProcesso: cleanNum } } },
              { query: { match_phrase: { numeroProcesso: cleanNum } } },
            ]

            let allHits = []
            let hasNetworkError = false
            let apiStatusError = null
            let formatError = false
            let selectedStrategy = null

            for (let s = 0; s < strategies.length; s++) {
              let bodyObj = {
                size: pageSize,
                query: strategies[s].query,
                sort: [{ '@timestamp': { order: 'asc' } }],
              }

              let res
              let retryCount = 0
              let successReq = false

              while (retryCount < 3 && !successReq) {
                try {
                  res = $http.send({
                    url: url,
                    method: 'POST',
                    headers: {
                      Authorization: 'APIKey ' + apiKey,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(bodyObj),
                    timeout: 30,
                  })
                  successReq = true
                } catch (err) {
                  retryCount++
                  if (retryCount >= 3) {
                    hasNetworkError = true
                    const errMsg = err && err.message ? err.message : String(err)
                    addErrorLog(record, 'Timeout ou falha de conexão com a API DataJud: ' + errMsg)
                    break
                  }
                }
              }

              if (hasNetworkError) break

              if (res && res.statusCode === 200) {
                let data
                try {
                  data = res.json
                } catch (err) {
                  formatError = true
                  break
                }

                if (data && data.hits && data.hits.hits && data.hits.hits.length > 0) {
                  selectedStrategy = strategies[s]
                  for (let i = 0; i < data.hits.hits.length; i++) {
                    allHits.push(data.hits.hits[i])
                  }

                  let searchAfter = data.hits.hits[data.hits.hits.length - 1].sort
                  let loopCount = 1

                  while (searchAfter && loopCount < 10) {
                    loopCount++
                    bodyObj.search_after = searchAfter

                    let nextRes
                    try {
                      nextRes = $http.send({
                        url: url,
                        method: 'POST',
                        headers: {
                          Authorization: 'APIKey ' + apiKey,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(bodyObj),
                        timeout: 30,
                      })
                      if (
                        nextRes.statusCode === 200 &&
                        nextRes.json &&
                        nextRes.json.hits &&
                        nextRes.json.hits.hits.length > 0
                      ) {
                        for (let i = 0; i < nextRes.json.hits.hits.length; i++) {
                          allHits.push(nextRes.json.hits.hits[i])
                        }
                        searchAfter = nextRes.json.hits.hits[nextRes.json.hits.hits.length - 1].sort
                      } else {
                        searchAfter = null
                      }
                    } catch (e) {
                      searchAfter = null
                    }
                  }
                  break
                }
              } else if (res && res.statusCode !== 200) {
                apiStatusError = res.statusCode
              }
            }

            if (!hasNetworkError && !formatError) {
              if (allHits.length === 0) {
                if (apiStatusError) {
                  record.set('datajudStatus', 'Sync Failed')
                  addErrorLog(record, 'A API DataJud retornou erro: ' + apiStatusError)
                } else {
                  record.set('datajudStatus', 'Not Found')
                }
              } else {
                for (let i = 0; i < allHits.length; i++) {
                  const proc = allHits[i] ? allHits[i]._source : null
                  if (proc && proc.orgaoJulgador && proc.orgaoJulgador.nomeOrgao) {
                    if (!record.get('court')) record.set('court', proc.orgaoJulgador.nomeOrgao)
                    break
                  }
                }

                const newLogs = []
                const uniqueKeys = {}

                for (let i = 0; i < allHits.length; i++) {
                  const proc = allHits[i] ? allHits[i]._source : null
                  const movimentos = proc && proc.movimentos ? proc.movimentos : []

                  for (let j = 0; j < movimentos.length; j++) {
                    const m = movimentos[j]
                    const dateStr = m.dataHora || new Date().toISOString()
                    let descStr = m.nome || m.descricao || 'Movimentação Datajud'

                    if (
                      Array.isArray(m.complementosTabelados) &&
                      m.complementosTabelados.length > 0
                    ) {
                      const compStrs = []
                      for (let k = 0; k < m.complementosTabelados.length; k++) {
                        const comp = m.complementosTabelados[k]
                        if (comp.nome && comp.valor) compStrs.push(comp.nome + ': ' + comp.valor)
                        else if (comp.descricao) compStrs.push(comp.descricao)
                      }
                      if (compStrs.length > 0) {
                        descStr += ' | ' + compStrs.join(' | ')
                      }
                    }

                    const dedupKey = dateStr + '_' + descStr

                    if (!uniqueKeys[dedupKey]) {
                      uniqueKeys[dedupKey] = true
                      newLogs.push({
                        date: dateStr,
                        description: descStr,
                        complementos: Array.isArray(m.complementosTabelados)
                          ? m.complementosTabelados
                          : [],
                        isManual: false,
                      })
                    }
                  }
                }

                const existingLogs = getSafeLogs(record)
                const manualLogs = []
                const errorLogs = []

                for (let i = 0; i < existingLogs.length; i++) {
                  const log = existingLogs[i]
                  if (log) {
                    if (log.isManual) manualLogs.push(log)
                    else if (log.description && String(log.description).startsWith('Falha'))
                      errorLogs.push(log)
                  }
                }

                const allLogs = manualLogs.concat(errorLogs).concat(newLogs)
                allLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

                record.set('trackingLogs', allLogs)
                record.set('datajudStatus', 'Success')
                success = true
              }
            } else if (hasNetworkError || formatError) {
              record.set('datajudStatus', 'Sync Failed')
            }
          }
        }
      }
    } catch (globalErr) {
      console.log('Global error in fetchAndMergeDatajud:', globalErr)
      record.set('datajudStatus', 'Sync Failed')
      const errMsg = globalErr && globalErr.message ? globalErr.message : String(globalErr)
      addErrorLog(record, 'Falha inesperada no processamento da sincronização DataJud: ' + errMsg)
    }

    $app.saveNoValidate(record)

    try {
      const logs = $app.findCollectionByNameOrId('audit_logs')
      const logRecord = new Record(logs)
      logRecord.set('collection_name', 'lawsuits')
      logRecord.set('record_id', record.id)
      logRecord.set('action', 'datajud_sync_async')
      logRecord.set('changes', {
        status: record.get('datajudStatus'),
        court: record.get('court'),
        success: success,
      })
      $app.saveNoValidate(logRecord)
    } catch (err) {}

    return e.json(200, { status: 'ok' })
  } catch (err) {
    console.log('Background sync error:', err)
    return e.json(500, { error: String(err) })
  }
})
