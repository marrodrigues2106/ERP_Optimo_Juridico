cronAdd('pje_worker', '* * * * *', () => {
  try {
    const pendingCases = $app.findRecordsByFilter(
      'legal_cases',
      "pje_sync_status = 'pending'",
      'updated',
      10,
      0,
    )
    if (!pendingCases || pendingCases.length === 0) return

    let apiKey = $secrets.get('COMUNICA_PJE_KEY') || ''
    if (!apiKey) {
      try {
        const config = $app.findFirstRecordByFilter('monitoring_configs', "apiKey != ''")
        apiKey = config.getString('apiKey')
      } catch (e) {}
    }
    apiKey = apiKey.trim()

    if (!apiKey || apiKey.length < 5) {
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('level', 'error')
        logRecord.set('module', 'PJe Sync Worker')
        logRecord.set('message', 'System error: Missing authentication token')
        logRecord.set('details', {})
        $app.saveNoValidate(logRecord)
      } catch (e) {}

      for (let i = 0; i < pendingCases.length; i++) {
        const record = pendingCases[i]
        record.set('pje_sync_status', 'error')
        try {
          $app.saveNoValidate(record)
        } catch (e) {}
      }
      return
    }

    const movementsCol = $app.findCollectionByNameOrId('case_movements')

    for (let i = 0; i < pendingCases.length; i++) {
      const record = pendingCases[i]
      const startTime = Date.now()
      const orgId = record.getString('organization')

      record.set('pje_sync_status', 'syncing')
      try {
        $app.saveNoValidate(record)
      } catch (e) {}

      let syncStatus = 'failed'
      let syncMessage = ''
      let added = 0
      let httpStatus = null
      let isProxied = false
      let usedProxyUrl = ''
      let cloudFrontRequestId = 'unknown'

      try {
        const num = record.getString('case_number')
        if (!num) throw new Error('No case number')

        const cleanNum = String(num).replace(/\D/g, '')
        if (cleanNum.length !== 20) throw new Error('Invalid case number')

        const currentDate = new Date().toISOString().split('T')[0]
        const url =
          'https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=' +
          cleanNum +
          '&dataDisponibilizacaoInicio=2024-01-01&dataDisponibilizacaoFim=' +
          currentDate

        const headers = {
          Accept:
            'application/json, text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          Connection: 'keep-alive',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          Referer: 'https://comunica.pje.jus.br/',
          Origin: 'https://comunica.pje.jus.br',
          Authorization: apiKey.startsWith('Bearer ') ? apiKey : 'Bearer ' + apiKey,
        }

        let proxyEnabled = false
        let proxyUrl = ''
        let proxyAuth = ''
        try {
          const enRecord = $app.findFirstRecordByFilter('settings', "key='pje_proxy_enabled'")
          proxyEnabled = enRecord.getString('value') === 'true'
          const urlRecord = $app.findFirstRecordByFilter('settings', "key='pje_proxy_url'")
          proxyUrl = urlRecord.getString('value')
          const authRecord = $app.findFirstRecordByFilter('settings', "key='pje_proxy_auth'")
          proxyAuth = authRecord.getString('value')
        } catch (e) {}

        let finalUrl = url
        if (proxyEnabled && proxyUrl) {
          isProxied = true
          usedProxyUrl = proxyUrl
          if (proxyUrl.indexOf('?') !== -1 || proxyUrl.endsWith('=')) {
            finalUrl = proxyUrl + encodeURIComponent(url)
          } else {
            finalUrl = url
              .replace('https://comunicaapi.pje.jus.br/api/v1', proxyUrl)
              .replace('https://comunica.pje.jus.br/api/v1', proxyUrl)
          }
          if (proxyAuth) {
            headers['Proxy-Authorization'] = proxyAuth
            headers['X-Proxy-Auth'] = proxyAuth
          }
        }

        const res = $http.send({ url: finalUrl, method: 'GET', headers: headers, timeout: 60 })
        httpStatus = res.statusCode

        if (res.headers) {
          cloudFrontRequestId =
            res.headers['x-amz-cf-id'] ||
            res.headers['X-Amz-Cf-Id'] ||
            res.headers['X-Amzn-Trace-Id'] ||
            res.headers['x-proxy-request-id'] ||
            res.headers['X-Proxy-Request-Id'] ||
            'unknown'
        }

        let data = null
        try {
          data = res.json
        } catch (err) {}

        if (res.statusCode === 200 && data && data.items) {
          const items = data.items
          for (let j = 0; j < items.length; j++) {
            const item = items[j]
            try {
              const uniqueStr = record.id + '_' + item.hash
              const extId = item.hash || $security.md5(uniqueStr)
              try {
                $app.findFirstRecordByFilter('case_movements', "external_id = '" + extId + "'")
              } catch (notfound) {
                const mov = new Record(movementsCol)
                mov.set('case', record.id)
                mov.set('event_date', item.dataDisponibilizacao || new Date().toISOString())
                mov.set('description', item.tipoComunicacao || 'Comunicação PJe')
                mov.set('details', item.texto || '')
                mov.set('source', 'PJe')
                mov.set('external_id', extId)
                if (orgId) mov.set('organization', orgId)
                $app.saveNoValidate(mov)
                added++
              }
            } catch (err) {}
          }

          syncStatus = 'success'
          syncMessage = 'Sincronizado com sucesso. ' + added + ' novas movimentações.'
          record.set('pje_sync_status', 'success')
          record.set('pje_last_sync', new Date().toISOString())
          record.set('datajud_sync_status', 'Success')
          record.set('datajud_last_sync', new Date().toISOString())
        } else {
          if (res.statusCode === 403)
            syncMessage = 'PJE_FORBIDDEN: Acesso negado pelo tribunal (403).'
          else if (res.statusCode === 400)
            syncMessage = 'PJE_BAD_REQUEST: Requisição inválida (400).'
          else if (res.statusCode === 401)
            syncMessage = 'PJE_UNAUTHORIZED: Token inválido/expirado (401).'
          else if (res.statusCode === 504 || res.statusCode === 503 || res.statusCode === 502)
            syncMessage = 'PJE_TIMEOUT: Sistema PJe indisponível.'
          else
            syncMessage =
              data && data.message
                ? 'PJe API Error: ' + data.message + ' (HTTP ' + res.statusCode + ')'
                : 'PJe API Error: HTTP ' + res.statusCode

          if (res.statusCode === 504 || res.statusCode === 503 || res.statusCode === 502) {
            record.set('pje_sync_status', 'pending')
          } else {
            record.set('pje_sync_status', 'error')
            record.set('datajud_sync_status', 'Error')
          }
        }
      } catch (err) {
        const msg = (err.message || '').toLowerCase()
        if (
          msg.indexOf('deadline') !== -1 ||
          msg.indexOf('timeout') !== -1 ||
          msg.indexOf('network') !== -1 ||
          msg.indexOf('gateway') !== -1
        ) {
          syncMessage = 'PJE_TIMEOUT: Sistema PJe indisponível.'
          record.set('pje_sync_status', 'pending')
        } else {
          syncMessage = err.message || 'Erro desconhecido'
          record.set('pje_sync_status', 'error')
          record.set('datajud_sync_status', 'Error')
        }
      }

      try {
        $app.saveNoValidate(record)
      } catch (e) {}

      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('level', syncStatus === 'success' ? 'info' : 'error')
        logRecord.set('module', 'PJe Sync Worker')
        logRecord.set('message', syncMessage)
        logRecord.set('details', {
          case: record.id,
          duration: Date.now() - startTime,
          status: syncStatus,
          proxied: isProxied,
          proxy_url: isProxied ? usedProxyUrl : null,
          request_id: cloudFrontRequestId,
          http_status: httpStatus,
        })
        if (orgId) logRecord.set('organization', orgId)
        $app.saveNoValidate(logRecord)
      } catch (e) {}
    }
  } catch (err) {
    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const audit = new Record(logsCol)
      audit.set('level', 'error')
      audit.set('module', 'PJe Sync Worker')
      audit.set('message', 'Worker critical error')
      audit.set('details', { error: err.message })
      $app.saveNoValidate(audit)
    } catch (e) {}
  }
})
