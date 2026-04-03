routerAdd('POST', '/backend/v1/datajud/background-sync/{id}', (e) => {
  try {
    const isInternal = e.requestInfo().body?.secret === 'internal-async-trigger'
    if (!isInternal && !e.auth) {
      return e.unauthorizedError('Authentication required')
    }

    const id = e.request.pathValue('id')
    const record = $app.findRecordById('legal_cases', id)

    let movementsCol = null
    try {
      movementsCol = $app.findCollectionByNameOrId('case_movements')
    } catch (err) {}

    const saveMovement = (
      dateStr,
      descStr,
      source,
      externalId,
      detailsStr,
      movementDetailsObj,
      orgId,
    ) => {
      if (!movementsCol) return false

      try {
        const existing = $app.findFirstRecordByFilter(
          'case_movements',
          `external_id = '${externalId}'`,
        )
        let updated = false
        if (existing.get('description') !== descStr) {
          existing.set('description', descStr)
          updated = true
        }
        if (detailsStr && existing.get('details') !== detailsStr) {
          existing.set('details', detailsStr)
          updated = true
        }
        if (movementDetailsObj) {
          const currJson = JSON.stringify(existing.get('movement_details') || {})
          const newJson = JSON.stringify(movementDetailsObj)
          if (currJson !== newJson) {
            existing.set('movement_details', movementDetailsObj)
            updated = true
          }
        }
        if (updated) {
          $app.saveNoValidate(existing)
        }
        return false
      } catch (err) {
        const mov = new Record(movementsCol)
        mov.set('case', id)
        mov.set('event_date', dateStr)
        mov.set('description', descStr || '')
        if (detailsStr) mov.set('details', detailsStr)
        if (movementDetailsObj) mov.set('movement_details', movementDetailsObj)
        mov.set('source', source)
        mov.set('external_id', externalId)
        if (orgId) mov.set('organization', orgId)
        $app.saveNoValidate(mov)
        return true
      }
    }

    const updateTribunalStatus = (aliasKey, status) => {
      try {
        const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
        if (configs.length > 0) {
          const cfg = configs[0]
          let stats = cfg.get('datajud_tribunal_status') || {}
          stats[aliasKey] = status
          cfg.set('datajud_tribunal_status', stats)
          $app.saveNoValidate(cfg)
        }
      } catch (e) {}
    }

    let apiKey = $secrets.get('DATAJUD_API_KEY') || ''
    let monitoredTribunals = []

    try {
      const activeTribunals = $app.findRecordsByFilter('tribunals', 'active = true', '', 1000, 0)
      activeTribunals.forEach((t) => {
        let a = t.get('alias')
        if (a) monitoredTribunals.push(String(a).toLowerCase().trim())
      })

      const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
      if (configs.length > 0) {
        const dbApiKey = configs[0].get('apiKey')
        if (dbApiKey) {
          apiKey = dbApiKey
        }
        const tList = configs[0].get('tribunais') || []
        tList.forEach((t) => {
          if (t) monitoredTribunals.push(String(t).toLowerCase().trim())
        })
      }
    } catch (err) {}

    const num = record.get('case_number') || ''
    const cleanNum = String(num).replace(/\D/g, '')

    if (cleanNum.length !== 20) {
      record.set('datajud_sync_status', 'Sync Failed')
      try {
        $app.saveNoValidate(record)
      } catch (e) {}
      return e.json(400, {
        status: 'error',
        errorType: 'INVALID_NUMBER',
        detail: `Número do processo inválido (${cleanNum}).`,
      })
    }

    let alias = record.get('court_alias')
    if (alias) {
      alias = String(alias).toLowerCase().trim()
      if (alias.startsWith('api_publica_')) {
        alias = alias.replace('api_publica_', '')
      }
    }

    if (!alias) {
      const jSegment = cleanNum.substring(13, 14)
      const trSegment = cleanNum.substring(14, 16)
      if (jSegment === '1') alias = 'stf'
      else if (jSegment === '2') alias = 'cnj'
      else if (jSegment === '3') alias = 'stj'
      else if (jSegment === '4') alias = 'trf' + parseInt(trSegment, 10)
      else if (jSegment === '5')
        alias = trSegment === '00' ? 'tst' : 'trt' + parseInt(trSegment, 10)
      else if (jSegment === '6') alias = trSegment === '00' ? 'tse' : 'tre'
      else if (jSegment === '7') alias = trSegment === '00' ? 'stm' : 'tjm'
      else if (jSegment === '8') {
        const ufs = {
          '01': 'ac',
          '02': 'al',
          '03': 'ap',
          '04': 'am',
          '05': 'ba',
          '06': 'ce',
          '07': 'dft',
          '08': 'es',
          '09': 'go',
          10: 'ma',
          11: 'mt',
          12: 'ms',
          13: 'mg',
          14: 'pa',
          15: 'pb',
          16: 'pr',
          17: 'pe',
          18: 'pi',
          19: 'rj',
          20: 'rn',
          21: 'rs',
          22: 'ro',
          23: 'rr',
          24: 'sc',
          25: 'sp',
          26: 'se',
          27: 'to',
        }
        alias = ufs[trSegment] ? 'tj' + ufs[trSegment] : null
      } else if (jSegment === '9') {
        const ufs = { 13: 'mg', 21: 'rs', 25: 'sp' }
        alias = ufs[trSegment] ? 'tjm' + ufs[trSegment] : null
      }
    }

    if (!alias) alias = 'tjrj'

    if (
      monitoredTribunals.length > 0 &&
      !monitoredTribunals.includes(alias) &&
      !monitoredTribunals.includes(`api_publica_${alias}`)
    ) {
      record.set('datajud_sync_status', 'Skipped (Tribunal not monitored)')
      try {
        $app.saveNoValidate(record)
      } catch (err) {}
      return e.json(200, {
        status: 'skipped',
        detail: `Tribunal ${alias} is not enabled in monitoring config.`,
      })
    }

    if (!apiKey) {
      return e.json(500, { error: 'A Chave da API do DataJud não está configurada no servidor.' })
    }

    const callDataJud = (targetAlias, key, bodyStr) => {
      const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${targetAlias}/_search`
      let result = { errorType: 'online', errorMessage: '', rawResponse: null }

      try {
        const res = $http.send({
          url: url,
          method: 'POST',
          headers: {
            Authorization: 'APIKey ' + key,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: bodyStr,
          timeout: 30,
        })

        try {
          result.rawResponse = res.json
        } catch (err) {}

        if (res.statusCode === 401 || res.statusCode === 403) {
          result.errorType = 'AUTH_FAILURE'
          result.errorMessage = `Erro de Autorização: Sem permissão para o tribunal ${targetAlias}.`
          updateTribunalStatus(targetAlias, 'unauthorized')
        } else if (res.statusCode === 404) {
          result.errorType = 'ENDPOINT_INVALID'
          result.errorMessage = 'Invalid Endpoint: Tribunal alias not recognized'
          updateTribunalStatus(targetAlias, 'not_found')
        } else if (res.statusCode >= 300) {
          result.errorType = 'HTTP_STATUS_ERRORS'
          result.errorMessage = 'HTTP Error: ' + res.statusCode
          updateTribunalStatus(targetAlias, 'error_' + res.statusCode)
        } else {
          updateTribunalStatus(targetAlias, 'ok')
        }
      } catch (err) {
        result.errorType = 'NETWORK_FAILURE'
        result.errorMessage = 'Network Failure: ' + String(err)
      }
      return result
    }

    let allHits = []
    let searchAfter = null
    let hasMore = true
    let fallbackUsed = false
    let currentAlias = alias
    let maxPages = 5 // Limit to prevent infinite loop

    // Fetch loop to handle pagination properly
    while (hasMore && maxPages > 0) {
      maxPages--
      const reqPayload = {
        size: 1000,
        query: {
          bool: {
            should: [
              { term: { 'numeroProcesso.keyword': cleanNum } },
              { term: { numeroProcesso: cleanNum } },
            ],
          },
        },
        sort: [{ '@timestamp': { order: 'asc' } }],
      }
      if (searchAfter) {
        reqPayload.search_after = searchAfter
      }

      let apiResult = callDataJud(currentAlias, apiKey, JSON.stringify(reqPayload))

      if (apiResult.errorType === 'ENDPOINT_INVALID' || apiResult.errorType === 'NETWORK_FAILURE') {
        if (!fallbackUsed) {
          currentAlias = currentAlias.includes('stj') ? 'tjrj' : 'stj'
          fallbackUsed = true
          apiResult = callDataJud(currentAlias, apiKey, JSON.stringify(reqPayload))
        }
      }

      if (apiResult.errorType !== 'online') {
        if (allHits.length === 0) {
          record.set('datajud_sync_status', 'Sync Failed')
          try {
            $app.saveNoValidate(record)
          } catch (err) {}
          return e.json(400, { status: 'error', detail: apiResult.errorMessage })
        } else {
          break // Stop paginating, keep what we have
        }
      }

      const data = apiResult.rawResponse
      const hits = data && data.hits && data.hits.hits ? data.hits.hits : []
      allHits = allHits.concat(hits)

      if (hits.length < 1000) {
        hasMore = false
      } else {
        const lastHit = hits[hits.length - 1]
        if (lastHit.sort && lastHit.sort.length > 0) {
          searchAfter = lastHit.sort
        } else {
          hasMore = false
        }
      }
    }

    let foundMatchingProc = false

    if (allHits.length === 0) {
      record.set('datajud_sync_status', 'Not Found')
    } else {
      let procs = allHits.filter(
        (h) => h._source && String(h._source.numeroProcesso).replace(/\D/g, '') === cleanNum,
      )
      if (procs.length === 0 && allHits.length > 0) procs = [allHits[0]]

      if (procs.length > 0) {
        foundMatchingProc = true
        const primarySource = procs[0]._source

        if (alias) {
          record.set('court', alias.toLowerCase())
          record.set('court_alias', alias.toLowerCase())
        } else if (primarySource.tribunal && primarySource.tribunal.nome) {
          record.set('court', primarySource.tribunal.nome)
        }

        if (primarySource.orgaoJulgador) {
          const courtOrganName =
            primarySource.orgaoJulgador.nomeOrgao || primarySource.orgaoJulgador.nome || ''
          if (courtOrganName) {
            record.set('court_organ', courtOrganName)
          }
        }

        if (primarySource.dataAjuizamento || primarySource.dataHora) {
          const dDate = primarySource.dataAjuizamento || primarySource.dataHora
          record.set('distribution_date', new Date(dDate).toISOString())
        }

        const oldStatus = record.get('status') || ''
        let latestMovTime = 0
        let latestMovDesc = ''

        procs.forEach((proc) => {
          const source = proc._source
          const caseOrganName = source.orgaoJulgador?.nomeOrgao || source.orgaoJulgador?.nome || ''
          const movimentos = source.movimentos || []

          for (let j = 0; j < movimentos.length; j++) {
            const m = movimentos[j]

            // Date mapping & timezone handling
            const dateStrRaw = m.dataHora || new Date().toISOString()
            let dDate = new Date(dateStrRaw)
            if (isNaN(dDate.getTime())) dDate = new Date()
            const isoDate = dDate.toISOString()
            const movTime = dDate.getTime()

            // Name mapping
            const descStr = m.nome || m.descricao || 'Movimentação Datajud'

            // Details and complements mapping
            let detailsStr = ''
            if (m.complementosTabelados && Array.isArray(m.complementosTabelados)) {
              detailsStr = m.complementosTabelados
                .map((c) => {
                  const val = c.valor || c.descricao || ''
                  return val ? `${c.nome}: ${val}` : c.nome
                })
                .join('\n')
            }
            if (m.textoCategoria) detailsStr += (detailsStr ? '\n\n' : '') + m.textoCategoria
            if (m.descricao && m.descricao !== descStr)
              detailsStr += (detailsStr ? '\n\n' : '') + m.descricao

            // Organ mapping
            const movOrganName =
              m.orgaoJulgador?.nomeOrgao || m.orgaoJulgador?.nome || caseOrganName
            const movementDetailsObj = {
              orgaoJulgador: movOrganName,
              complementosTabelados: m.complementosTabelados || [],
            }

            if (movTime > latestMovTime) {
              latestMovTime = movTime
              latestMovDesc = descStr
            }

            // Duplicate prevention logic
            const uniqueStr = `${id}_${isoDate}_${descStr}`
            const extId = m.id || m.idMovimento || `${id}_${$security.md5(uniqueStr)}`

            saveMovement(
              isoDate,
              descStr,
              'DataJud',
              extId,
              detailsStr,
              movementDetailsObj,
              record.get('organization'),
            )
          }
        })

        let newStatus = oldStatus
        if (latestMovDesc) {
          newStatus = latestMovDesc
        } else if (primarySource.classe && primarySource.classe.nome) {
          newStatus = primarySource.classe.nome
        } else if (primarySource.fase) {
          newStatus = primarySource.fase
        }

        record.set('status', newStatus)

        if (newStatus && newStatus !== oldStatus && oldStatus !== '') {
          try {
            const eventsCol = $app.findCollectionByNameOrId('agenda_events')
            const evt = new Record(eventsCol)
            evt.set('title', 'Alteração de Fase: ' + (record.get('case_number') || ''))
            evt.set('type', 'Task')
            evt.set('description', 'O processo mudou de fase para: ' + newStatus)
            evt.set('linked_lawsuit', record.id)
            evt.set('start_date', new Date().toISOString())
            if (record.get('organization')) evt.set('organization', record.get('organization'))
            const collab = record.get('responsible_collaborator')
            if (collab) evt.set('collaborator', collab)
            $app.saveNoValidate(evt)
          } catch (err) {}
        }

        // Sync metadata mapping
        record.set('datajud_sync_status', 'Success')
        record.set('datajud_last_sync', new Date().toISOString())
      } else {
        record.set('datajud_sync_status', 'Not Found')
      }
    }

    try {
      $app.saveNoValidate(record)
    } catch (err) {}

    return e.json(200, { status: foundMatchingProc ? 'ok' : 'not_found' })
  } catch (globalErr) {
    return e.json(500, { error: String(globalErr) })
  }
})
