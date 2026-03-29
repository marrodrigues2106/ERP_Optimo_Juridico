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

    const saveMovement = (dateStr, descStr, source, externalId) => {
      if (!movementsCol) return false

      const cleanDate = new Date(dateStr).toISOString().substring(0, 10)
      const extId = externalId || `${id}_${cleanDate}_${$security.md5(descStr)}`

      try {
        $app.findFirstRecordByFilter('case_movements', `external_id = '${extId}'`)
        return false
      } catch (err) {
        const mov = new Record(movementsCol)
        mov.set('case', id)
        mov.set('event_date', new Date(dateStr).toISOString())
        mov.set('description', descStr || '')
        mov.set('source', source)
        mov.set('external_id', extId)
        $app.saveNoValidate(mov)
        return true
      }
    }

    const apiKey = $secrets.get('DATAJUD_API_KEY') || ''

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

    if (!alias) {
      alias = 'tjrj'
    }

    if (!apiKey) {
      return e.json(500, {
        error: 'A Chave da API do DataJud não está configurada no servidor (Secrets).',
      })
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
          result.errorMessage = 'Verifique as permissões da sua API Key no portal do CNJ.'
        } else if (res.statusCode === 404) {
          result.errorType = 'ENDPOINT_INVALID'
          result.errorMessage = 'Invalid Endpoint: Tribunal alias not recognized'
        } else if (res.statusCode >= 300) {
          result.errorType = 'HTTP_STATUS_ERRORS'
          result.errorMessage = 'HTTP Error: ' + res.statusCode
        }
      } catch (err) {
        result.errorType = 'NETWORK_FAILURE'
        result.errorMessage = 'Network Failure: ' + String(err)
      }
      return result
    }

    const reqPayload = {
      size: 100,
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

    let apiResult = callDataJud(alias, apiKey, JSON.stringify(reqPayload))

    if (apiResult.errorType === 'ENDPOINT_INVALID' || apiResult.errorType === 'NETWORK_FAILURE') {
      const fallbackAlias = alias.includes('stj') ? 'tjrj' : 'stj'
      const fallbackResult = callDataJud(fallbackAlias, apiKey, JSON.stringify(reqPayload))
      if (fallbackResult.errorType === 'online') {
        apiResult = fallbackResult
      }
    }

    if (apiResult.errorType !== 'online') {
      record.set('datajud_sync_status', 'Sync Failed')
      try {
        $app.saveNoValidate(record)
      } catch (err) {}
      return e.json(400, { status: 'error', detail: apiResult.errorMessage })
    }

    const data = apiResult.rawResponse
    const hits = data && data.hits && data.hits.hits ? data.hits.hits : []

    let foundMatchingProc = false

    if (hits.length === 0) {
      record.set('datajud_sync_status', 'Not Found')
    } else {
      let proc = hits.find(
        (h) => h._source && String(h._source.numeroProcesso).replace(/\D/g, '') === cleanNum,
      )
      if (!proc && hits.length > 0) proc = hits[0]

      if (proc) {
        foundMatchingProc = true
        const source = proc._source

        if (source.tribunal && source.tribunal.nome) {
          record.set('court', source.tribunal.nome)
        }
        if (source.orgaoJulgador && source.orgaoJulgador.nomeOrgao) {
          record.set('court_organ', source.orgaoJulgador.nomeOrgao)
        }
        if (source.dataAjuizamento || source.dataHora) {
          const dDate = source.dataAjuizamento || source.dataHora
          record.set('distribution_date', new Date(dDate).toISOString())
        }

        const lastSyncStr = record.get('datajud_last_sync')
        let lastSyncTime = lastSyncStr ? new Date(lastSyncStr).getTime() : 0
        let newLastSyncTime = lastSyncTime

        const movimentos = source.movimentos || []
        let latestMovTime = 0
        let latestMovDesc = ''

        for (let j = 0; j < movimentos.length; j++) {
          const m = movimentos[j]
          const dateStr = m.dataHora || new Date().toISOString()
          const movTime = new Date(dateStr).getTime()
          let descStr = m.nome || m.descricao || 'Movimentação Datajud'

          if (movTime > latestMovTime) {
            latestMovTime = movTime
            latestMovDesc = descStr
          }

          let extId = m.idDocumento || `${id}_${movTime}_${$security.md5(descStr)}`
          saveMovement(dateStr, descStr, 'DataJud', extId)

          if (movTime > newLastSyncTime) newLastSyncTime = movTime
        }

        if (latestMovDesc) {
          record.set('status', latestMovDesc)
        } else if (source.classe && source.classe.nome) {
          record.set('status', source.classe.nome)
        } else if (source.fase) {
          record.set('status', source.fase)
        }

        record.set('datajud_sync_status', 'Success')
        if (newLastSyncTime > 0)
          record.set('datajud_last_sync', new Date(newLastSyncTime).toISOString())
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
