routerAdd(
  'POST',
  '/backend/v1/datajud/background-sync/{id}',
  (e) => {
    try {
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

      const addErrorLog = (msg) => {
        saveMovement(new Date().toISOString(), msg, 'Sistema', { error: true })
      }

      const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
      const cfg = configs.length > 0 ? configs[0] : null
      const apiKey = cfg ? cfg.get('apiKey') : ''

      const updateConfigStatus = (status, latency, errType, errStr) => {
        if (!cfg) return
        cfg.set('lastStatus', status)
        cfg.set('lastLatency', latency)
        cfg.set('datajudStatus', errType)
        cfg.set('datajudLastError', errStr)
        cfg.set('datajudLastCheckAt', new Date().toISOString())
        try {
          $app.saveNoValidate(cfg)
        } catch (e) {}
      }

      if (!apiKey) {
        record.set('datajudStatus', 'Sync Failed')
        addErrorLog('Configuration Missing: API Key is not set.')
        updateConfigStatus(0, 0, 'API_KEY_MISSING', 'Configuration Missing: API Key is not set')
        $app.saveNoValidate(record)
        return e.json(400, { status: 'error', errorType: 'API_KEY_MISSING' })
      }

      const num = record.get('number') || ''
      const cleanNum = String(num).replace(/\D/g, '')

      if (cleanNum.length !== 20) {
        record.set('datajudStatus', 'Sync Failed')
        addErrorLog(`Falha na sincronização: Número do processo inválido (${cleanNum}).`)
        $app.saveNoValidate(record)
        return e.json(400, { status: 'error', errorType: 'Invalid Number' })
      }

      const courtName = record.get('court')
      const tribunals = $app.findRecordsByFilter('tribunals', 'active = true', '', 100, 0)
      let alias = null

      for (let t = 0; t < tribunals.length; t++) {
        const tr = tribunals[t]
        if (
          courtName &&
          (tr.get('name').toLowerCase() === courtName.toLowerCase() ||
            tr.get('alias') === courtName.toLowerCase())
        ) {
          alias = tr.get('alias')
          break
        }
      }

      if (!alias) {
        record.set('datajudStatus', 'Sync Failed')
        addErrorLog('Invalid Endpoint: Tribunal alias not recognized.')
        updateConfigStatus(
          0,
          0,
          'ENDPOINT_INVALID',
          'Invalid Endpoint: Tribunal alias not recognized',
        )
        $app.saveNoValidate(record)
        return e.json(400, { status: 'error', errorType: 'ENDPOINT_INVALID' })
      }

      const callDataJud = (targetAlias, key, bodyStr) => {
        const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${targetAlias}/_search`
        const start = Date.now()
        let result = {
          statusCode: 0,
          latency: 0,
          errorType: 'online',
          errorMessage: '',
          rawResponse: null,
        }

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

          result.latency = Date.now() - start
          result.statusCode = res.statusCode
          result.rawResponse = res.json

          if (res.statusCode === 401 || res.statusCode === 403) {
            result.errorType = 'AUTH_FAILURE'
            result.errorMessage = 'Authentication Error: Invalid or expired API Key'
          } else if (res.statusCode === 404) {
            result.errorType = 'ENDPOINT_INVALID'
            result.errorMessage = 'Invalid Endpoint: Tribunal alias not recognized'
          } else if (res.statusCode >= 300) {
            result.errorType = 'HTTP_STATUS_ERRORS'
            result.errorMessage = 'HTTP Error: ' + res.statusCode
          } else {
            result.errorType = 'online'
          }
        } catch (err) {
          result.latency = Date.now() - start
          const errStr = String(err).toLowerCase()
          if (
            errStr.includes('lookup') ||
            errStr.includes('no such host') ||
            errStr.includes('dns') ||
            errStr.includes('resolve')
          ) {
            result.errorType = 'DNS_FAILURE'
            result.errorMessage =
              'DNS Failure: Could not resolve host api-publica.datajud.cnj.jus.br'
          } else if (errStr.includes('timeout') || errStr.includes('deadline')) {
            result.errorType = 'NETWORK_TIMEOUT'
            result.errorMessage = 'Connection Timeout: Server took too long to respond (30s)'
          } else if (errStr.includes('connection refused')) {
            result.errorType = 'NETWORK_REFUSED'
            result.errorMessage = 'Network Refused: Connection refused by the server'
          } else {
            result.errorType = 'NETWORK_FAILURE'
            result.errorMessage = 'Network Failure: ' + String(err)
          }
        }
        return result
      }

      const requestBody = JSON.stringify({
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
      })

      const apiResult = callDataJud(alias, apiKey, requestBody)
      let success = false

      if (apiResult.errorType !== 'online') {
        record.set('datajudStatus', 'Sync Failed')
        addErrorLog(`Falha Datajud: ${apiResult.errorMessage}`)
        updateConfigStatus(
          apiResult.statusCode,
          apiResult.latency,
          apiResult.errorType,
          apiResult.errorMessage,
        )
      } else {
        const data = apiResult.rawResponse
        const hits = data && data.hits && data.hits.hits ? data.hits.hits : []
        if (hits.length === 0) {
          record.set('datajudStatus', 'Not Found')
        } else {
          const proc = hits[0]._source
          if (proc && proc.orgaoJulgador && proc.orgaoJulgador.nomeOrgao && !record.get('court')) {
            record.set('court', proc.orgaoJulgador.nomeOrgao)
          }

          const lastSyncStr = record.get('last_sync')
          let lastSyncTime = lastSyncStr ? new Date(lastSyncStr).getTime() : 0
          let newLastSyncTime = lastSyncTime

          for (let h = 0; h < hits.length; h++) {
            const movimentos = hits[h]._source.movimentos || []
            for (let j = 0; j < movimentos.length; j++) {
              const m = movimentos[j]
              const dateStr = m.dataHora || new Date().toISOString()
              const movTime = new Date(dateStr).getTime()
              let descStr = m.nome || m.descricao || 'Movimentação Datajud'
              const isNew = saveMovement(dateStr, descStr, 'DataJud', { datajud_raw: m })

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
                  } catch (e) {}
                }
              }
              if (movTime > newLastSyncTime) newLastSyncTime = movTime
            }
          }
          record.set('datajudStatus', 'Success')
          if (newLastSyncTime > 0) record.set('last_sync', new Date(newLastSyncTime).toISOString())
          success = true
        }
        updateConfigStatus(apiResult.statusCode, apiResult.latency, 'online', '')
      }

      try {
        $app.saveNoValidate(record)
      } catch (e) {}

      return e.json(200, { status: success ? 'ok' : 'error', detail: apiResult.errorMessage })
    } catch (globalErr) {
      return e.json(500, { error: String(globalErr) })
    }
  },
  $apis.requireAuth(),
)
