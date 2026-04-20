routerAdd(
  'POST',
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

    try {
      let apiKey = ''
      try {
        const config = $app.findFirstRecordByFilter('monitoring_configs', "apiKey != ''")
        apiKey = config.getString('apiKey')
      } catch (e) {}

      if (!apiKey) apiKey = $secrets.get('COMUNICA_PJE_KEY') || ''
      apiKey = apiKey.trim()

      const inlabsKey = $secrets.get('INLABS') || ''

      const currentDate = new Date().toISOString().split('T')[0]
      let baseUrl = 'https://comunica.pje.jus.br/api/v1'
      if (inlabsKey) {
        baseUrl = 'https://pje.inlabs.app/api/v1'
      } else if (apiKey && apiKey.length >= 5) {
        baseUrl = 'https://comunicaapi.pje.jus.br/api/v1'
      }

      const url = `${baseUrl}/comunicacao?numeroProcesso=${cleanNum}&dataDisponibilizacaoInicio=2024-01-01&dataDisponibilizacaoFim=${currentDate}`

      const headers = {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        Connection: 'keep-alive',
      }

      if (inlabsKey) {
        headers.Authorization = `Bearer ${inlabsKey}`
      } else if (apiKey && apiKey.length >= 5) {
        headers.Authorization = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`
      }

      const res = $http.send({
        url: url,
        method: 'GET',
        headers: headers,
        timeout: 60,
      })

      let data = null
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

            try {
              $app.findFirstRecordByFilter('case_movements', `external_id = '${extId}'`)
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
        })

        syncStatus = 'success'
        syncMessage = `Sincronizado com sucesso. ${added} novas movimentações.`
        record.set('pje_sync_status', 'idle')
        record.set('pje_last_sync', new Date().toISOString())
        record.set('datajud_sync_status', 'Success')
        record.set('datajud_last_sync', new Date().toISOString())
      } else {
        if (res.statusCode === 403)
          syncMessage = `PJE_FORBIDDEN: Acesso negado (403). Response: ${res.raw ? String(res.raw) : JSON.stringify(data || {})}`
        else if (res.statusCode === 400)
          syncMessage = `PJE_BAD_REQUEST: Requisição inválida (400). Response: ${JSON.stringify(data || {})}`
        else if (res.statusCode === 401)
          syncMessage = `PJE_UNAUTHORIZED: Token inválido/expirado (401). Response: ${JSON.stringify(data || {})}`
        else if ([504, 503, 502].includes(res.statusCode))
          syncMessage = 'PJE_TIMEOUT: Sistema PJe indisponível.'
        else
          syncMessage =
            data && data.message
              ? `PJe API Error: ${data.message} (HTTP ${res.statusCode})`
              : `PJe API Error: HTTP ${res.statusCode}`
        record.set('pje_sync_status', 'error')
        record.set('datajud_sync_status', 'Error')
      }
    } catch (err) {
      record.set('pje_sync_status', 'error')
      record.set('datajud_sync_status', 'Error')
      const msg = (err.message || '').toLowerCase()
      if (
        msg.includes('deadline') ||
        msg.includes('timeout') ||
        msg.includes('network') ||
        msg.includes('gateway')
      ) {
        syncMessage = 'PJE_TIMEOUT: Sistema PJe indisponível.'
      } else {
        syncMessage = err.message || 'Erro desconhecido'
      }
    }

    try {
      $app.saveNoValidate(record)
    } catch (e) {}

    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logsCol)
      logRecord.set('level', syncStatus === 'success' ? 'info' : 'error')
      logRecord.set('module', 'PJe Sync')
      logRecord.set('message', syncMessage)
      logRecord.set('details', {
        case: record.id,
        duration: Date.now() - startTime,
        status: syncStatus,
      })
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
