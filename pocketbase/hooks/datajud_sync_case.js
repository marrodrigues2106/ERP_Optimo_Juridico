routerAdd(
  'POST',
  '/backend/v1/datajud/sync-case',
  (e) => {
    const body = e.requestInfo().body || {}
    const caseId = body.caseId

    if (!caseId) {
      return e.badRequestError('Missing caseId in request body')
    }

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

      const fixEncodingStr = (str) => {
        if (!str) return ''
        return str
          .replace(/ï¿½RGï¿½O/g, 'ÓRGÃO')
          .replace(/ï¿½rgï¿½o/g, 'Órgão')
          .replace(/Aï¿½ï¿½O/g, 'AÇÃO')
          .replace(/aï¿½ï¿½o/g, 'ação')
          .replace(/DECISï¿½O/g, 'DECISÃO')
          .replace(/decisï¿½o/g, 'decisão')
          .replace(/CONCLUSï¿½O/g, 'CONCLUSÃO')
          .replace(/conclusï¿½o/g, 'conclusão')
          .replace(/Sï¿½O/g, 'SÃO')
          .replace(/sï¿½o/g, 'são')
          .replace(/Nï¿½O/g, 'NÃO')
          .replace(/nï¿½o/g, 'não')
          .replace(/Justiï¿½a/g, 'Justiça')
          .replace(/Mï¿½S/g, 'MÊS')
          .replace(/mï¿½s/g, 'mês')
          .replace(/TRï¿½S/g, 'TRÊS')
          .replace(/trï¿½s/g, 'três')
          .replace(/CONCILIAï¿½ï¿½O/g, 'CONCILIAÇÃO')
          .replace(/conciliaï¿½ï¿½o/g, 'conciliação')
          .replace(/INFORMAï¿½ï¿½O/g, 'INFORMAÇÃO')
          .replace(/informaï¿½ï¿½o/g, 'informação')
          .replace(/PETIï¿½ï¿½O/g, 'PETIÇÃO')
          .replace(/petiï¿½ï¿½o/g, 'petição')
          .replace(/RELAï¿½ï¿½O/g, 'RELAÇÃO')
          .replace(/relaï¿½ï¿½o/g, 'relação')
          .replace(/CITAï¿½ï¿½O/g, 'CITAÇÃO')
          .replace(/citaï¿½ï¿½o/g, 'citação')
          .replace(/INTIMAï¿½ï¿½O/g, 'INTIMAÇÃO')
          .replace(/intimaï¿½ï¿½o/g, 'intimação')
          .replace(/PUBLICAï¿½ï¿½O/g, 'PUBLICAÇÃO')
          .replace(/publicaï¿½ï¿½o/g, 'publicação')
          .replace(/EXPEDIï¿½ï¿½O/g, 'EXPEDIÇÃO')
          .replace(/expediï¿½ï¿½o/g, 'expedição')
          .replace(/CERTIDï¿½O/g, 'CERTIDÃO')
          .replace(/certidï¿½o/g, 'certidão')
          .replace(/EXECUï¿½ï¿½O/g, 'EXECUÇÃO')
          .replace(/execuï¿½ï¿½o/g, 'execução')
          .replace(/APELAï¿½ï¿½O/g, 'APELAÇÃO')
          .replace(/apelaï¿½ï¿½o/g, 'apelação')
          .replace(/ACï¿½RDï¿½O/g, 'ACÓRDÃO')
          .replace(/acï¿½rdï¿½o/g, 'acórdão')
          .replace(/VARA Cï¿½VEL/g, 'VARA CÍVEL')
          .replace(/Vara Cï¿½vel/g, 'Vara Cível')
          .replace(/TRIBUNAL DE JUSTIï¿½A/g, 'TRIBUNAL DE JUSTIÇA')
          .replace(/Cï¿½DIGO/g, 'CÓDIGO')
          .replace(/cï¿½digo/g, 'código')
          .replace(/SESSï¿½O/g, 'SESSÃO')
          .replace(/sessï¿½o/g, 'sessão')
          .replace(/AUDIï¿½NCIA/g, 'AUDIÊNCIA')
          .replace(/audiï¿½ncia/g, 'audiência')
          .replace(/Fï¿½RUM/g, 'FÓRUM')
          .replace(/fï¿½rum/g, 'fórum')
          .replace(/Cï¿½MARA/g, 'CÂMARA')
          .replace(/cï¿½mara/g, 'câmara')
          .replace(/COLï¿½GIO/g, 'COLÉGIO')
          .replace(/colï¿½gio/g, 'colégio')
          .replace(/ELETRï¿½NICO/g, 'ELETRÔNICO')
          .replace(/eletrï¿½nico/g, 'eletrônico')
          .replace(/Mï¿½RITO/g, 'MÉRITO')
          .replace(/mï¿½rito/g, 'mérito')
          .replace(/PROCEDï¿½NCIA/g, 'PROCEDÊNCIA')
          .replace(/procedï¿½ncia/g, 'procedência')
          .replace(/IMPROCEDï¿½NCIA/g, 'IMPROCEDÊNCIA')
          .replace(/improcedï¿½ncia/g, 'improcedência')
          .replace(/ï¿½/g, '')
      }

      if (caseData.orgaoJulgador && caseData.orgaoJulgador.nome) {
        record.set('court_organ', fixEncodingStr(caseData.orgaoJulgador.nome))
      }

      if (caseData.dataAjuizamento) {
        record.set('distribution_date', caseData.dataAjuizamento)
      }

      syncStatus = 'Success'
      syncMessage = `Metadados atualizados com sucesso pelo DataJud.`
    } catch (err) {
      syncStatus = 'Error'
      syncMessage = err.message || 'Erro desconhecido durante a sincronização de metadados.'
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
        numero_processo: record.getString('case_number'),
        case_id: record.id,
        duration_ms: Date.now() - startTime,
        status: syncStatus,
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
