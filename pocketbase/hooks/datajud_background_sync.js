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

      if (!apiKey) {
        record.set('datajudStatus', 'Sync Failed')
        addErrorLog('Configuration Missing: API Key is not set.')
        if (cfg) {
          cfg.set('lastError', 'Configuration Missing: API Key is not set')
          try {
            $app.saveNoValidate(cfg)
          } catch (e) {}
        }
        $app.saveNoValidate(record)
        return e.json(400, { status: 'error', errorType: 'Configuration Missing' })
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
        if (cfg) {
          cfg.set('lastError', 'Invalid Endpoint: Tribunal alias not recognized')
          try {
            $app.saveNoValidate(cfg)
          } catch (e) {}
        }
        $app.saveNoValidate(record)
        return e.json(400, { status: 'error', errorType: 'Invalid Endpoint' })
      }

      const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`
      let res
      let lastErrorString = ''
      const start = Date.now()
      let success = false

      try {
        try {
          $http.send({ url: 'https://1.1.1.1', method: 'GET', timeout: 2 })
        } catch (err) {}

        res = $http.send({
          url: url,
          method: 'POST',
          headers: {
            Authorization: 'APIKey ' + apiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
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
          }),
          timeout: 30, // Updated timeout
        })

        if (res.statusCode === 401 || res.statusCode === 403) {
          lastErrorString = 'Authentication Error: Invalid or expired API Key'
        } else if (res.statusCode === 404) {
          lastErrorString = 'Invalid Endpoint: Tribunal alias not recognized'
        } else if (res.statusCode >= 300) {
          lastErrorString = 'HTTP Error: ' + res.statusCode
        } else {
          const data = res.json
          const hits = data && data.hits && data.hits.hits ? data.hits.hits : []
          if (hits.length === 0) {
            record.set('datajudStatus', 'Not Found')
          } else {
            const proc = hits[0]._source
            if (
              proc &&
              proc.orgaoJulgador &&
              proc.orgaoJulgador.nomeOrgao &&
              !record.get('court')
            ) {
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
            if (newLastSyncTime > 0)
              record.set('last_sync', new Date(newLastSyncTime).toISOString())
            success = true
          }
        }
      } catch (err) {
        const errStr = String(err).toLowerCase()
        if (
          errStr.includes('no such host') ||
          errStr.includes('dns') ||
          errStr.includes('resolve')
        ) {
          lastErrorString = 'DNS Failure: Could not resolve host'
        } else if (errStr.includes('timeout') || errStr.includes('deadline')) {
          lastErrorString = 'Connection Timeout: Server took too long to respond'
        } else {
          lastErrorString = 'Network Failure: ' + String(err)
        }
      }

      if (cfg) {
        cfg.set('lastStatus', res ? res.statusCode : 0)
        cfg.set('lastLatency', Date.now() - start)
        if (lastErrorString) cfg.set('lastError', lastErrorString)
        try {
          $app.saveNoValidate(cfg)
        } catch (e) {}
      }

      if (lastErrorString) {
        record.set('datajudStatus', 'Sync Failed')
        addErrorLog(`Falha Datajud: ${lastErrorString}`)
      }

      try {
        $app.saveNoValidate(record)
      } catch (e) {}

      return e.json(200, { status: success ? 'ok' : 'error', detail: lastErrorString })
    } catch (globalErr) {
      return e.json(500, { error: String(globalErr) })
    }
  },
  $apis.requireAuth(),
)
