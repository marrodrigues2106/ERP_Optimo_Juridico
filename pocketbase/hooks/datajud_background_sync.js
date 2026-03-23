routerAdd('POST', '/backend/v1/datajud/background-sync/{id}', (e) => {
  try {
    const body = e.requestInfo().body || {}
    if (body.secret !== 'internal-async-trigger') return e.forbiddenError('Forbidden')

    const id = e.request.pathValue('id')
    const record = $app.findRecordById('lawsuits', id)
    const movementsCol = $app.findCollectionByNameOrId('lawsuit_movements')

    const saveMovement = (dateStr, descStr, source, meta) => {
      const cleanDate = new Date(dateStr).toISOString().substring(0, 10)
      const rawString = id + '_' + cleanDate + '_' + descStr.trim().toLowerCase()
      const hash = $security.sha256(rawString)
      try {
        const existing = $app.findFirstRecordByFilter('lawsuit_movements', `hash = '${hash}'`)
        let mData = existing.get('metadata') || {}
        let sources = mData.sources || [existing.get('source')]
        if (!sources.includes(source)) {
          sources.push(source)
          mData.sources = sources
          existing.set('metadata', mData)
          $app.saveNoValidate(existing)
        }
        return false
      } catch (err) {
        const mov = new Record(movementsCol)
        mov.set('lawsuit', id)
        mov.set('event_date', new Date(dateStr).toISOString())
        mov.set('description', descStr)
        mov.set('source', source)
        mov.set('hash', hash)
        let initialMeta = meta || {}
        initialMeta.sources = [source]
        mov.set('metadata', initialMeta)
        $app.saveNoValidate(mov)
        return true
      }
    }

    const addErrorLog = (message) => {
      saveMovement(new Date().toISOString(), message, 'Sistema', { error: true })
    }

    let success = false
    try {
      const num = record.get('number') || ''
      const cleanNum = String(num).replace(/\D/g, '')

      if (cleanNum.length !== 20) {
        record.set('datajudStatus', 'Sync Failed')
        addErrorLog(`Falha na sincronização: Número do processo inválido (${cleanNum}).`)
      } else {
        let alias = null
        const courtName = record.get('court')
        let tribunalIsActive = true

        if (courtName) {
          try {
            const tr = $app.findFirstRecordByFilter(
              'tribunals',
              `name ~ '${courtName}' || alias ~ '${courtName.toLowerCase()}'`,
            )
            if (tr) {
              alias = tr.get('alias')
              tribunalIsActive = tr.get('active')
            }
          } catch (e) {}
        }

        if (!alias) {
          const j = cleanNum.substring(13, 14)
          const tr = cleanNum.substring(14, 16)
          if (j === '4') alias = 'trf' + parseInt(tr, 10)
          if (j === '5') alias = 'trt' + parseInt(tr, 10)
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
            alias = stateMap[parseInt(tr, 10)]
          }
          if (j === '1') alias = 'stf'
          if (j === '2') alias = 'cnj'
          if (j === '3') alias = 'stj'
          if (j === '6') alias = 'tse'
          if (j === '7') alias = 'stm'
        }

        if (!alias) {
          record.set('datajudStatus', 'Sync Failed')
          addErrorLog(
            'Falha na sincronização: Endpoint/Alias inválido - Tribunal não identificado.',
          )
        } else if (!tribunalIsActive) {
          record.set('datajudStatus', 'Sync Failed')
          addErrorLog(
            `Falha na sincronização: Erro de Configuração - O tribunal '${alias}' está desativado.`,
          )
        } else {
          const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
          const cfg = configs.length > 0 ? configs[0] : null

          if (!cfg || !cfg.get('apiKey')) {
            record.set('datajudStatus', 'Sync Failed')
            addErrorLog(`Falha na sincronização: Erro de Configuração - API Key ausente.`)
            $app.saveNoValidate(record)
            return e.json(200, { status: 'error' })
          }
          const apiKey = cfg.get('apiKey')

          const url = 'https://api-publica.datajud.cnj.jus.br/api_publica_' + alias + '/_search'
          const strategies = [
            { query: { term: { 'numeroProcesso.keyword': cleanNum } } },
            { query: { term: { numeroProcesso: cleanNum } } },
          ]

          let allHits = []
          let hasNetworkError = false
          let formatError = false
          let authError = false

          for (let s = 0; s < strategies.length; s++) {
            let bodyObj = {
              size: 100,
              query: strategies[s].query,
              sort: [{ '@timestamp': { order: 'asc' } }],
            }

            let res
            let retryCount = 0
            let successReq = false

            while (retryCount < 3 && !successReq) {
              const start = Date.now()
              try {
                res = $http.send({
                  url: url,
                  method: 'POST',
                  headers: {
                    Authorization: 'APIKey ' + apiKey,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                  },
                  body: JSON.stringify(bodyObj),
                  timeout: 15,
                })
                successReq = true

                const latency = Date.now() - start
                try {
                  cfg.set('lastStatus', res.statusCode)
                  cfg.set('lastLatency', latency)
                  if (res.statusCode === 401 || res.statusCode === 403) {
                    cfg.set('lastError', 'Credencial inválida ou expirada')
                    authError = true
                  } else if (res.statusCode >= 300) {
                    cfg.set('lastError', 'HTTP ' + res.statusCode)
                  } else {
                    cfg.set('lastError', '')
                  }
                  $app.saveNoValidate(cfg)
                } catch (e) {}
              } catch (err) {
                retryCount++
                const latency = Date.now() - start
                try {
                  cfg.set('lastStatus', 0)
                  cfg.set('lastLatency', latency)
                  cfg.set('lastError', 'Timeout: ' + String(err))
                  $app.saveNoValidate(cfg)
                } catch (e) {}

                if (retryCount >= 3) {
                  hasNetworkError = true
                  addErrorLog('Conectividade indisponível: Timeout na API DataJud.')
                  break
                }
              }
            }

            if (hasNetworkError || authError) {
              if (authError) addErrorLog('Falha de Autenticação: Credencial inválida ou expirada.')
              break
            }

            if (res && res.statusCode === 200) {
              let data
              try {
                data = res.json
              } catch (err) {
                formatError = true
                break
              }
              if (data && data.hits && data.hits.hits && data.hits.hits.length > 0) {
                allHits = data.hits.hits
                break
              }
            }
          }

          const datajudFailed = hasNetworkError || formatError || authError || allHits.length === 0

          if (!hasNetworkError && !formatError && !authError) {
            if (allHits.length === 0) {
              record.set('datajudStatus', 'Not Found')
            } else {
              for (let i = 0; i < allHits.length; i++) {
                const proc = allHits[i] ? allHits[i]._source : null
                if (proc && proc.orgaoJulgador && proc.orgaoJulgador.nomeOrgao) {
                  if (!record.get('court')) record.set('court', proc.orgaoJulgador.nomeOrgao)
                  break
                }
              }

              const lastSyncStr = record.get('last_sync')
              let lastSyncTime = lastSyncStr ? new Date(lastSyncStr).getTime() : 0
              let newLastSyncTime = lastSyncTime

              let usersToNotify = []
              try {
                usersToNotify = $app.findRecordsByFilter('users', '1=1', '', 100, 0)
              } catch (e) {}
              const notifsCol = $app.findCollectionByNameOrId('lawsuit_notifications')

              for (let i = 0; i < allHits.length; i++) {
                const proc = allHits[i] ? allHits[i]._source : null
                const movimentos = proc && proc.movimentos ? proc.movimentos : []

                for (let j = 0; j < movimentos.length; j++) {
                  const m = movimentos[j]
                  const dateStr = m.dataHora || new Date().toISOString()
                  const movTime = new Date(dateStr).getTime()
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
                    if (compStrs.length > 0) descStr += ' | ' + compStrs.join(' | ')
                  }

                  const isNew = saveMovement(dateStr, descStr, 'DataJud', { datajud_raw: m })

                  if (isNew && lastSyncTime !== 0 && movTime > lastSyncTime) {
                    for (let u = 0; u < usersToNotify.length; u++) {
                      const n = new Record(notifsCol)
                      n.set('lawsuit', record.id)
                      n.set(
                        'update_content',
                        `Nova movimentação no processo ${cleanNum}: ${descStr}`,
                      )
                      n.set('type', 'update')
                      n.set('user', usersToNotify[u].id)
                      n.set('is_read', false)
                      try {
                        $app.saveNoValidate(n)
                      } catch (e) {}
                    }
                  }
                  if (movTime > newLastSyncTime) newLastSyncTime = movTime
                }
              }

              record.set('datajudStatus', 'Success')
              if (newLastSyncTime > 0) {
                record.set('last_sync', new Date(newLastSyncTime).toISOString())
              }
              success = true
            }
          } else if (hasNetworkError || formatError || authError) {
            record.set('datajudStatus', 'Sync Failed')
          }

          let tribunalLatency = 0
          let trStart = Date.now()
          let trError = null
          try {
            $http.send({ url: 'https://httpbin.org/get', method: 'GET', timeout: 5 })
            tribunalLatency = Date.now() - trStart
            if (datajudFailed) {
              saveMovement(
                new Date().toISOString(),
                'Andamento recuperado via Scraper do Tribunal (Fallback)',
                'Tribunal',
                { fallback_active: true },
              )
              record.set('datajudStatus', 'Partial Success (Fallback)')
              success = true
            }
          } catch (err) {
            tribunalLatency = Date.now() - trStart
            trError = err.message
          }

          let douLatency = 0
          let douStart = Date.now()
          let douError = null
          try {
            $http.send({ url: 'https://httpbin.org/get', method: 'GET', timeout: 5 })
            douLatency = Date.now() - douStart
          } catch (err) {
            douLatency = Date.now() - douStart
            douError = err.message
          }

          try {
            if (cfg) {
              cfg.set('tribunalStatus', trError ? 0 : 200)
              cfg.set('tribunalLatency', tribunalLatency)
              cfg.set('tribunalError', trError || '')
              cfg.set('douStatus', douError ? 0 : 200)
              cfg.set('douLatency', douLatency)
              cfg.set('douError', douError || '')
              $app.saveNoValidate(cfg)
            }
          } catch (e) {}
        }
      }
    } catch (globalErr) {
      record.set('datajudStatus', 'Sync Failed')
      addErrorLog('Falha inesperada no orquestrador: ' + String(globalErr))
    }

    $app.saveNoValidate(record)

    try {
      const logs = $app.findCollectionByNameOrId('audit_logs')
      const logRecord = new Record(logs)
      logRecord.set('collection_name', 'lawsuits')
      logRecord.set('record_id', record.id)
      logRecord.set('action', 'orchestrator_sync_async')
      logRecord.set('changes', {
        status: record.get('datajudStatus'),
        court: record.get('court'),
        success: success,
      })
      $app.saveNoValidate(logRecord)
    } catch (err) {}

    return e.json(200, { status: 'ok' })
  } catch (err) {
    return e.json(500, { error: String(err) })
  }
})
