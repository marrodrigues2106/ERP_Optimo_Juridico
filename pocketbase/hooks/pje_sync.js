routerAdd(
  'GET',
  '/backend/v1/processos/{caseId}/sync-pje',
  (e) => {
    const caseId = e.request.pathValue('caseId')
    let record
    try {
      record = $app.findRecordById('legal_cases', caseId)
    } catch (err) {
      throw new NotFoundError('Case not found')
    }

    const userOrg = e.auth?.getString('active_organization')
    if (
      userOrg &&
      record.getString('organization') &&
      record.getString('organization') !== userOrg
    ) {
      return e.forbiddenError('Sem permissão para acessar este processo.')
    }

    if (record.getString('pje_sync_status') === 'syncing') {
      return e.json(200, { success: true, message: 'Processo já está em sincronização.' })
    }

    const num = record.getString('case_number')
    if (!num) {
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('level', 'warning')
        logRecord.set('module', 'PJe Sync')
        logRecord.set('message', 'Processo sem número para sincronização.')
        logRecord.set('details', { case: record.id })
        if (record.getString('organization'))
          logRecord.set('organization', record.getString('organization'))
        $app.saveNoValidate(logRecord)
      } catch (logErr) {}

      record.set('pje_sync_status', 'error')
      try {
        $app.saveNoValidate(record)
      } catch (err) {}
      return e.badRequestError('Processo sem número para sincronização.')
    }

    const cleanNum = String(num).replace(/\D/g, '')
    if (cleanNum.length !== 20) {
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('level', 'warning')
        logRecord.set('module', 'PJe Sync')
        logRecord.set('message', 'Número de processo inválido.')
        logRecord.set('details', { case: record.id })
        if (record.getString('organization'))
          logRecord.set('organization', record.getString('organization'))
        $app.saveNoValidate(logRecord)
      } catch (logErr) {}

      record.set('pje_sync_status', 'error')
      try {
        $app.saveNoValidate(record)
      } catch (err) {}
      return e.badRequestError('Número de processo inválido (deve conter 20 dígitos numéricos).')
    }

    record.set('pje_sync_status', 'syncing')
    try {
      $app.saveNoValidate(record)
    } catch (err) {}

    const movementsCol = $app.findCollectionByNameOrId('case_movements')
    const startTime = Date.now()
    const orgId = record.getString('organization')

    let syncStatus = 'failed'
    let syncMessage = ''
    let added = 0
    let cloudFrontRequestId = 'unknown'
    let httpStatus = null
    let isProxied = false
    let usedProxyUrl = ''
    let data = null

    try {
      let apiKey = ''
      try {
        const config = $app.findFirstRecordByFilter('monitoring_configs', "apiKey != ''")
        apiKey = config.getString('apiKey')
      } catch (e) {}

      if (!apiKey) apiKey = $secrets.get('COMUNICA_PJE_KEY') || ''
      apiKey = apiKey.trim()

      const currentDate = new Date().toISOString().split('T')[0]
      let baseUrl = 'https://comunica.pje.jus.br/api/v1'
      if (apiKey && apiKey.length >= 5) {
        baseUrl = 'https://comunicaapi.pje.jus.br/api/v1'
      }

      const url = `${baseUrl}/comunicacao?numeroProcesso=${cleanNum}&dataDisponibilizacaoInicio=2024-01-01&dataDisponibilizacaoFim=${currentDate}`

      const headers = {
        Accept:
          'application/json, text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        Referer: 'https://comunica.pje.jus.br/',
        Origin: 'https://comunica.pje.jus.br',
      }

      if (apiKey && apiKey.length >= 5) {
        headers.Authorization = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`
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

      const res = $http.send({
        url: finalUrl,
        method: 'GET',
        headers: headers,
        timeout: 60,
      })

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

      try {
        data = res.json
      } catch (err) {}

      const isArrayData = Array.isArray(data)
      const hasItems = data && Array.isArray(data.items)
      const items = hasItems ? data.items : isArrayData ? data : null

      if (res.statusCode === 200 && items) {
        items.forEach((item) => {
          try {
            const uniqueStr = record.id + '_' + item.hash
            const extId = item.hash || $security.md5(uniqueStr)

            const movementDetailsObj = {
              meio: item.meio || '',
              tipoDocumento: item.tipoDocumento || '',
              numeroComunicacao: item.numeroComunicacao || '',
              link: item.link || '',
              destinatarios: item.destinatarios || [],
              hash: item.hash || '',
              orgaoJulgador: item.nomeOrgao || '',
              classe: item.nomeClasse || '',
              protocolo: item.protocolo || null,
              recibo: item.recibo || null,
              ciencia: item.ciencia || null,
              teor: item.teor || item.texto || '',
            }

            try {
              const existing = $app.findFirstRecordByFilter(
                'case_movements',
                `external_id = '${extId}'`,
              )
              let updated = false
              const currDetails = existing.get('movement_details') || {}
              if (JSON.stringify(currDetails) !== JSON.stringify(movementDetailsObj)) {
                existing.set('movement_details', movementDetailsObj)
                updated = true
              }
              const newDetailsStr = item.teor || item.texto || ''
              if (existing.get('details') !== newDetailsStr) {
                existing.set('details', newDetailsStr)
                updated = true
              }
              if (updated) {
                $app.saveNoValidate(existing)
              }
            } catch (notfound) {
              const mov = new Record(movementsCol)
              mov.set('case', record.id)
              mov.set('event_date', item.dataDisponibilizacao || new Date().toISOString())
              mov.set('description', item.tipoComunicacao || 'Comunicação PJe')
              mov.set('details', item.teor || item.texto || '')
              mov.set('movement_details', movementDetailsObj)
              mov.set('source', 'PJe')
              mov.set('external_id', extId)
              if (orgId) mov.set('organization', orgId)
              $app.saveNoValidate(mov)
              added++
            }

            try {
              const resultsCol = $app.findCollectionByNameOrId('results')
              let existingResult = null
              try {
                existingResult = $app.findFirstRecordByFilter(
                  'results',
                  `hash_comunicacao = '${item.hash}'`,
                )
              } catch (err) {}

              if (existingResult) {
                if (!existingResult.getString('legal_case')) {
                  existingResult.set('legal_case', record.id)
                  $app.saveNoValidate(existingResult)
                }
              } else {
                const resultRecord = new Record(resultsCol)
                resultRecord.set('legal_case', record.id)
                resultRecord.set('sigla_tribunal', item.siglaTribunal)
                resultRecord.set('tipo_comunicacao', item.tipoComunicacao)
                resultRecord.set('nome_orgao', item.nomeOrgao)
                resultRecord.set('texto', item.teor || item.texto || '')
                resultRecord.set('numero_processo', item.numeroProcesso)
                resultRecord.set('meio', item.meio)
                resultRecord.set('tipo_documento', item.tipoDocumento)
                resultRecord.set('nome_classe', item.nomeClasse)
                resultRecord.set('data_disponibilizacao', item.dataDisponibilizacao)
                resultRecord.set('numero_comunicacao', item.numeroComunicacao)
                resultRecord.set('link', item.link)
                resultRecord.set('hash_comunicacao', item.hash)
                resultRecord.set('status_comunicacao', item.status)
                resultRecord.set('raw_json', item)
                $app.saveNoValidate(resultRecord)
              }
            } catch (resErr) {
              console.log('Erro ao salvar no results', resErr)
            }
          } catch (err) {}
        })

        syncStatus = 'success'
        syncMessage = `Sincronizado com sucesso. ${added} novas movimentações.`
        record.set('pje_sync_status', 'success')
        record.set('pje_last_sync', new Date().toISOString())
        record.set('datajud_sync_status', 'Success')
        record.set('datajud_last_sync', new Date().toISOString())
      } else {
        if (res.statusCode === 403) {
          syncMessage = `PJE_FORBIDDEN: Acesso negado (403). Response: ${res.raw ? String(res.raw) : JSON.stringify(data || {})}`
          record.set('pje_sync_status', 'error')
          record.set('pje_last_sync', new Date().toISOString())
        } else if (res.statusCode === 400) {
          syncMessage = `PJE_BAD_REQUEST: Requisição inválida (400). Response: ${JSON.stringify(data || {})}`
          record.set('pje_sync_status', 'error')
        } else if (res.statusCode === 401) {
          syncMessage = `PJE_UNAUTHORIZED: Token inválido/expirado (401). Response: ${JSON.stringify(data || {})}`
          record.set('pje_sync_status', 'error')
        } else if ([504, 503, 502].includes(res.statusCode)) {
          syncMessage = 'PJE_TIMEOUT: Sistema PJe indisponível.'
          record.set('pje_sync_status', 'pending')
        } else {
          syncMessage =
            data && data.message
              ? `PJe API Error: ${data.message} (HTTP ${res.statusCode})`
              : `PJe API Error: HTTP ${res.statusCode}`
          record.set('pje_sync_status', 'error')
        }
      }
    } catch (err) {
      const msg = (err.message || '').toLowerCase()
      if (
        msg.includes('deadline') ||
        msg.includes('timeout') ||
        msg.includes('network') ||
        msg.includes('gateway') ||
        msg.includes('no such host')
      ) {
        syncMessage = 'PJE_TIMEOUT: Sistema PJe indisponível ou falha de conectividade.'
        record.set('pje_sync_status', 'pending')
      } else {
        syncMessage = err.message || 'Erro desconhecido ao tentar conectar.'
        record.set('pje_sync_status', 'error')
      }
    }

    try {
      $app.saveNoValidate(record)
    } catch (e) {}

    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logsCol)

      if (syncMessage.includes('PJE_FORBIDDEN')) {
        logRecord.set('level', 'error')
        logRecord.set('module', 'PJe-Sync')
        logRecord.set('message', 'Bloqueio CloudFront (403) detectado durante sincronização PJe.')
        logRecord.set('details', {
          'Request ID': cloudFrontRequestId,
          case_id: record.id,
          response: data || null,
          proxied: isProxied,
          proxy_url: isProxied ? usedProxyUrl : null,
          http_status: httpStatus,
        })
      } else {
        logRecord.set('level', syncStatus === 'success' ? 'info' : 'error')
        logRecord.set('module', 'PJe-Sync')
        logRecord.set('message', syncMessage)
        logRecord.set('details', {
          case: record.id,
          duration: Date.now() - startTime,
          status: syncStatus,
          error_response: syncStatus !== 'success' ? data || null : null,
          proxied: isProxied,
          proxy_url: isProxied ? usedProxyUrl : null,
          request_id: cloudFrontRequestId,
          http_status: httpStatus,
        })
      }

      if (orgId) logRecord.set('organization', orgId)
      $app.saveNoValidate(logRecord)
    } catch (e) {}

    try {
      const pjeLogsCol = $app.findCollectionByNameOrId('pje_sync_logs')
      const pjeLogRecord = new Record(pjeLogsCol)
      pjeLogRecord.set('case', record.id)
      pjeLogRecord.set('status', syncStatus === 'success' ? 'success' : 'failed')
      pjeLogRecord.set('message', syncMessage)
      pjeLogRecord.set('duration', Date.now() - startTime)
      if (orgId) pjeLogRecord.set('organization', orgId)
      $app.saveNoValidate(pjeLogRecord)
    } catch (e) {}

    if (syncStatus === 'success') {
      return e.json(200, { success: true, message: syncMessage })
    } else {
      if (syncMessage.includes('PJE_FORBIDDEN')) return e.forbiddenError(syncMessage)
      if (syncMessage.includes('PJE_UNAUTHORIZED')) return e.unauthorizedError(syncMessage)
      return e.badRequestError(syncMessage)
    }
  },
  $apis.requireAuth(),
)
