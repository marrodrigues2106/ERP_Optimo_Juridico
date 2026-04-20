routerAdd(
  'POST',
  '/backend/v1/datajud/sync/{caseId}',
  (e) => {
    const caseId = e.request.pathValue('caseId')
    let record
    try {
      record = $app.findRecordById('legal_cases', caseId)
    } catch (err) {
      return e.notFoundError('Processo não encontrado.')
    }

    const userOrg = e.auth?.getString('active_organization')
    if (
      userOrg &&
      record.getString('organization') &&
      record.getString('organization') !== userOrg
    ) {
      return e.forbiddenError('Sem permissão para acessar este processo.')
    }

    const num = record.getString('case_number')
    if (!num) {
      return e.badRequestError('Processo sem número para sincronização.')
    }
    const cleanNum = String(num).replace(/\D/g, '')
    if (cleanNum.length !== 20) {
      return e.badRequestError('Número de processo inválido (deve conter 20 dígitos numéricos).')
    }

    let apiKey = $secrets.get('DATAJUD_API_KEY') || ''
    try {
      const config = $app.findFirstRecordByFilter('monitoring_configs', "id != ''")
      if (config && config.getString('apiKey')) {
        apiKey = config.getString('apiKey')
      }
    } catch (_) {}

    if (!apiKey) {
      return e.internalServerError('Chave da API do DataJud não configurada.')
    }

    record.set('datajud_sync_status', 'Syncing')
    try {
      $app.saveNoValidate(record)
    } catch (_) {}

    const startTime = Date.now()
    let syncStatus = 'Error'
    let syncMessage = ''
    let added = 0

    try {
      let alias = record.getString('court_alias')
      if (!alias) {
        const courtName = record.getString('court') || ''
        const normalized = courtName.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (normalized.startsWith('tjrj')) alias = 'tjrj'
        else if (normalized.startsWith('trf1')) alias = 'trf1'
        else if (normalized.startsWith('trf')) alias = normalized.substring(0, 4)
        else if (normalized.startsWith('tj')) alias = normalized.substring(0, 4)
        else alias = 'tjrj'
      }

      alias = alias.replace('api_publica_', '').toLowerCase()

      const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`
      const payload = {
        query: {
          match: {
            numeroProcesso: cleanNum,
          },
        },
      }

      const res = $http.send({
        url: url,
        method: 'POST',
        headers: {
          Authorization: 'APIKey ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        timeout: 30,
      })

      if (res.statusCode >= 400) {
        syncMessage = 'Erro no DataJud: HTTP ' + res.statusCode
        if (res.statusCode === 404) syncMessage = 'Processo não encontrado no tribunal (404).'
        if (res.statusCode === 401 || res.statusCode === 403)
          syncMessage = 'Erro de autenticação no DataJud. Verifique a chave da API.'
        throw new Error(syncMessage)
      }

      const data = res.json
      if (!data || !data.hits || !data.hits.hits || data.hits.hits.length === 0) {
        syncMessage = 'Processo não encontrado no DataJud.'
        throw new Error(syncMessage)
      }

      const caseData = data.hits.hits[0]._source

      record.set('metadata', caseData)
      record.set('datajud_last_sync', new Date().toISOString())
      record.set('datajud_sync_status', 'Success')

      if (caseData.movimentos && Array.isArray(caseData.movimentos)) {
        const movementsCol = $app.findCollectionByNameOrId('case_movements')
        const orgId = record.getString('organization')

        caseData.movimentos.forEach((mov) => {
          try {
            const movDate = mov.dataHora || new Date().toISOString()
            const desc = mov.nome || 'Movimento sem descrição'
            const codigo = mov.codigo || ''

            const uniqueStr = record.id + '_' + movDate + '_' + codigo
            const extId = 'dj_' + $security.md5(uniqueStr)

            let existing = null
            try {
              existing = $app.findFirstRecordByFilter('case_movements', `external_id = '${extId}'`)
            } catch (_) {
              try {
                const safeDesc = desc.replace(/'/g, "''")
                existing = $app.findFirstRecordByFilter(
                  'case_movements',
                  `case = '${record.id}' && event_date = '${movDate}' && description = '${safeDesc}'`,
                )
              } catch (_) {}
            }

            if (!existing) {
              const newMov = new Record(movementsCol)
              newMov.set('case', record.id)
              newMov.set('event_date', movDate)
              newMov.set('description', desc)
              newMov.set('source', 'DataJud')
              newMov.set('external_id', extId)

              const details = {
                codigo: codigo,
                orgaoJulgador: caseData.orgaoJulgador?.nome || '',
                classe: caseData.classe?.nome || '',
                documentosVinculados: mov.documentosVinculados || [],
              }
              newMov.set('movement_details', details)

              if (mov.complementosTabelados && mov.complementosTabelados.length > 0) {
                newMov.set('details', JSON.stringify(mov.complementosTabelados, null, 2))
              }

              if (orgId) newMov.set('organization', orgId)

              $app.saveNoValidate(newMov)
              added++
            }
          } catch (err) {}
        })
      }

      syncStatus = 'Success'
      syncMessage = `Sincronizado com sucesso. ${added} novas movimentações.`
    } catch (err) {
      syncStatus = 'Error'
      syncMessage = err.message || 'Erro desconhecido durante a sincronização.'
      record.set('datajud_sync_status', 'Error')
    }

    try {
      $app.saveNoValidate(record)
    } catch (_) {}

    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logsCol)
      logRecord.set('level', syncStatus === 'Success' ? 'info' : 'error')
      logRecord.set('module', 'datajud_sync')
      logRecord.set('message', syncMessage)
      logRecord.set('details', {
        case_id: record.id,
        duration_ms: Date.now() - startTime,
        status: syncStatus,
        added_movements: added,
      })
      const orgId = record.getString('organization')
      if (orgId) logRecord.set('organization', orgId)
      $app.saveNoValidate(logRecord)
    } catch (_) {}

    if (syncStatus === 'Success') {
      return e.json(200, { success: true, message: syncMessage })
    } else {
      return e.badRequestError(syncMessage)
    }
  },
  $apis.requireAuth(),
)
