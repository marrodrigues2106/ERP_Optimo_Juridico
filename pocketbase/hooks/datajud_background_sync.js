routerAdd('POST', '/backend/v1/datajud/background-sync/{id}', (e) => {
  try {
    const isInternal = e.requestInfo().body?.secret === 'internal-async-trigger'
    if (!isInternal && !e.auth) {
      return e.unauthorizedError('Authentication required')
    }

    const id = e.request.pathValue('id')
    const record = $app.findRecordById('lawsuits', id)
    const movementsCol = $app.findCollectionByNameOrId('lawsuit_movements')
    const notifsCol = $app.findCollectionByNameOrId('lawsuit_notifications')

    let usersToNotify = []
    try {
      usersToNotify = $app.findRecordsByFilter('users', '1=1', '', 100, 0)
    } catch (err) {}

    const saveMovement = (dateStr, descStr, source, meta) => {
      const cleanDate = new Date(dateStr).toISOString().substring(0, 10)
      const rawString = id + '_' + cleanDate + '_' + (descStr || '').trim().toLowerCase()
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
        mov.set('description', descStr || '')
        mov.set('source', source)
        mov.set('hash', hash)
        let initialMeta = meta || {}
        initialMeta.sources = [source]
        mov.set('metadata', initialMeta)
        $app.saveNoValidate(mov)
        return true
      }
    }

    const apiKey = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='

    const num = record.get('number') || ''
    const cleanNum = String(num).replace(/\D/g, '')

    if (cleanNum.length !== 20) {
      record.set('datajudStatus', 'Sync Failed')
      try {
        $app.saveNoValidate(record)
      } catch (e) {}
      return e.json(400, {
        status: 'error',
        errorType: 'INVALID_NUMBER',
        detail: `Número do processo inválido (${cleanNum}).`,
      })
    }

    let alias = null

    const jSegment = cleanNum.substring(13, 14)
    const trSegment = cleanNum.substring(14, 16)

    if (jSegment === '1') {
      alias = 'stf'
    } else if (jSegment === '2') {
      alias = 'cnj'
    } else if (jSegment === '3') {
      alias = 'stj'
    } else if (jSegment === '4') {
      alias = 'trf' + parseInt(trSegment, 10)
    } else if (jSegment === '5') {
      alias = trSegment === '00' ? 'tst' : 'trt' + parseInt(trSegment, 10)
    } else if (jSegment === '6') {
      alias = trSegment === '00' ? 'tse' : 'tre'
    } else if (jSegment === '7') {
      alias = trSegment === '00' ? 'stm' : 'tjm'
    } else if (jSegment === '8') {
      const ufs = {
        '01': 'tjac',
        '02': 'tjal',
        '03': 'tjap',
        '04': 'tjam',
        '05': 'tjba',
        '06': 'tjce',
        '07': 'tjdft',
        '08': 'tjes',
        '09': 'tjgo',
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
        25: 'tjsp',
        26: 'tjse',
        27: 'tjto',
      }
      alias = ufs[trSegment] || null
    } else if (jSegment === '9') {
      const ufs = { 13: 'tjmmg', 21: 'tjmrs', 25: 'tjmsp' }
      alias = ufs[trSegment] || null
    }

    if (!alias) {
      alias = 'tjrj'
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
          result.errorMessage = 'Authentication Error: Invalid or expired API Key'
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
      const fallbackAlias = alias === 'stj' ? 'tjrj' : 'stj'
      const fallbackResult = callDataJud(fallbackAlias, apiKey, JSON.stringify(reqPayload))
      if (fallbackResult.errorType === 'online') {
        apiResult = fallbackResult
      }
    }

    if (apiResult.errorType !== 'online') {
      record.set('datajudStatus', 'Sync Failed')
      try {
        $app.saveNoValidate(record)
      } catch (err) {}
      return e.json(400, { status: 'error', detail: apiResult.errorMessage })
    }

    const data = apiResult.rawResponse
    const hits = data && data.hits && data.hits.hits ? data.hits.hits : []

    let foundMatchingProc = false

    if (hits.length === 0) {
      record.set('datajudStatus', 'Not Found')
    } else {
      let proc = hits.find(
        (h) => h._source && String(h._source.numeroProcesso).replace(/\D/g, '') === cleanNum,
      )
      if (!proc && hits.length > 0) proc = hits[0]

      if (proc) {
        foundMatchingProc = true
        const source = proc._source

        if (source.orgaoJulgador && source.orgaoJulgador.nomeOrgao) {
          record.set('court', source.orgaoJulgador.nomeOrgao)
        }
        if (source.classe && source.classe.nome) {
          record.set('status', source.classe.nome)
        } else if (source.fase) {
          record.set('status', source.fase)
        }

        const lastSyncStr = record.get('last_sync')
        let lastSyncTime = lastSyncStr ? new Date(lastSyncStr).getTime() : 0
        let newLastSyncTime = lastSyncTime

        const movimentos = source.movimentos || []
        for (let j = 0; j < movimentos.length; j++) {
          const m = movimentos[j]
          const dateStr = m.dataHora || new Date().toISOString()
          const movTime = new Date(dateStr).getTime()
          let descStr = m.nome || m.descricao || 'Movimentação Datajud'

          let comps = []
          if (m.complementosTabelados) {
            comps = m.complementosTabelados.map((c) => ({
              nome: c.nome || '',
              valor: c.valor || c.descricao || '',
            }))
          }

          const isNew = saveMovement(dateStr, descStr, 'DataJud', {
            datajud_raw: m,
            complementos: comps,
          })

          if (isNew && lastSyncTime !== 0 && movTime > lastSyncTime) {
            for (let u = 0; u < usersToNotify.length; u++) {
              const n = new Record(notifsCol)
              n.set('lawsuit', record.id)
              n.set('update_content', `Nova movimentação: ${descStr}`)
              n.set('type', 'update')
              n.set('user', usersToNotify[u].id)
              n.set('is_read', false)
              try {
                $app.saveNoValidate(n)
              } catch (err) {}
            }
          }
          if (movTime > newLastSyncTime) newLastSyncTime = movTime
        }

        record.set('datajudStatus', 'Success')
        if (newLastSyncTime > 0) record.set('last_sync', new Date(newLastSyncTime).toISOString())
      } else {
        record.set('datajudStatus', 'Not Found')
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
