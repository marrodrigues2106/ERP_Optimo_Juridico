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

    if (record.getString('pje_sync_status') === 'syncing') {
      return e.json(200, { success: true, message: 'Processo já está em sincronização.' })
    }

    const num = record.getString('case_number')
    if (!num) {
      return e.badRequestError('Processo sem número para sincronização.')
    }

    const cleanNum = String(num).replace(/\D/g, '')
    if (cleanNum.length !== 20) {
      return e.badRequestError('Número de processo inválido (deve conter 20 dígitos numéricos).')
    }

    record.set('pje_sync_status', 'syncing')
    $app.saveNoValidate(record)

    const logsCol = $app.findCollectionByNameOrId('pje_sync_logs')
    const movementsCol = $app.findCollectionByNameOrId('case_movements')
    const startTime = Date.now()
    const orgId = record.getString('organization')

    let syncStatus = 'failed'
    let syncMessage = ''
    let added = 0

    try {
      let apiKey = $secrets.get('COMUNICA_PJE_KEY')
      if (!apiKey) {
        try {
          const config = $app.findFirstRecordByFilter('monitoring_configs', "apiKey != ''")
          apiKey = config.getString('apiKey')
        } catch (e) {}
      }

      if (!apiKey) {
        throw new Error('PJE_FORBIDDEN: Chave de API não configurada. Acesso negado.')
      }

      apiKey = apiKey.trim()

      const url = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao'
      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        Connection: 'keep-alive',
        Authorization: `Bearer ${apiKey}`,
      }

      const payload = {
        numeroProcesso: cleanNum,
      }

      const res = $http.send({
        url: url,
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        timeout: 60,
      })

      let data = null
      try {
        data = res.json
      } catch (err) {}

      if (res.statusCode === 200 && data && data.items) {
        const items = data.items

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
        if (res.statusCode === 403) {
          syncMessage = `PJE_FORBIDDEN: Acesso negado pelo tribunal (403). Response: ${JSON.stringify(data || {})}`
        } else if (res.statusCode === 400) {
          syncMessage = `PJE_BAD_REQUEST: Requisição inválida ou processo não encontrado (400). Response: ${JSON.stringify(data || {})}`
        } else if (res.statusCode === 401) {
          syncMessage = `PJE_UNAUTHORIZED: Token inválido ou expirado (401). Response: ${JSON.stringify(data || {})}`
        } else if (res.statusCode === 504 || res.statusCode === 503 || res.statusCode === 502) {
          syncMessage = 'PJE_TIMEOUT: Sistema PJe indisponível.'
        } else {
          syncMessage =
            data && data.message
              ? `PJe API Error: ${data.message} (HTTP ${res.statusCode})`
              : `PJe API Error: HTTP ${res.statusCode}`
        }
        record.set('pje_sync_status', 'error')
        record.set('datajud_sync_status', 'Error')
      }
    } catch (err) {
      record.set('pje_sync_status', 'error')
      record.set('datajud_sync_status', 'Error')
      const msg = (err.message || '').toLowerCase()
      if (
        msg.includes('context deadline exceeded') ||
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
      const logRecord = new Record(logsCol)
      logRecord.set('case', record.id)
      logRecord.set('status', syncStatus)
      logRecord.set('message', syncMessage)
      logRecord.set('duration', Date.now() - startTime)
      if (orgId) logRecord.set('organization', orgId)
      $app.saveNoValidate(logRecord)
    } catch (e) {}

    if (syncStatus === 'success') {
      return e.json(200, { success: true, message: syncMessage })
    } else {
      return e.badRequestError(syncMessage)
    }
  },
  $apis.requireAuth(),
)
