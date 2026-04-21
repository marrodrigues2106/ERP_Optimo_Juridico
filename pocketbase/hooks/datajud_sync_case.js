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

      if (caseData.movimentos && Array.isArray(caseData.movimentos)) {
        const movementsCol = $app.findCollectionByNameOrId('case_movements')
        const orgId = record.getString('organization')

        caseData.movimentos.forEach((mov) => {
          try {
            const movDate = mov.dataHora || new Date().toISOString()

            let descBase = 'Movimento sem descrição'
            let codigo = ''

            if (mov.tipo && mov.tipo.nacional) {
              descBase = mov.tipo.nacional.nome || mov.tipo.nacional.descricao || descBase
              codigo = String(mov.tipo.nacional.codigo || mov.tipo.nacional.id || '')
            } else if (mov.tipo && mov.tipo.local) {
              descBase = mov.tipo.local.nome || mov.tipo.local.descricao || descBase
              codigo = String(mov.tipo.local.codigo || mov.tipo.local.id || '')
            } else if (mov.nome) {
              descBase = mov.nome
              codigo = String(mov.codigo || '')
            } else if (mov.descricao) {
              descBase = mov.descricao
            }

            const complementosList = mov.complementosTabelados || mov.complementos || []
            let complementosText = complementosList
              .map((c) => `${c.nome || c.descricao}: ${c.valor || c.descricaoValor || '-'}`)
              .join(' | ')

            let desc = descBase
            if (complementosText) {
              desc = `${descBase} — ${complementosText}`
            }

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
              newMov.set('description', fixEncodingStr(desc))
              newMov.set('source', 'DataJud')
              newMov.set('external_id', extId)

              let teorText =
                mov.texto || mov.teor || mov.textoIntegral || mov.decisao || mov.conteudo || null

              if (teorText) {
                teorText = fixEncodingStr(teorText)
              }

              let orgaoJulgador = caseData.orgaoJulgador?.nome || ''
              if (orgaoJulgador) {
                orgaoJulgador = fixEncodingStr(orgaoJulgador)
              }

              let docs = []
              if (Array.isArray(mov.documentosVinculados))
                docs = docs.concat(mov.documentosVinculados)
              if (Array.isArray(mov.documentos)) docs = docs.concat(mov.documentos)
              if (mov.documento) {
                if (Array.isArray(mov.documento)) docs = docs.concat(mov.documento)
                else if (typeof mov.documento === 'object') docs.push(mov.documento)
              }

              const normalizedDocs = docs.map((d) => ({
                idDocumento: d.idDocumento || d.id || d.hash,
                id: d.id || d.idDocumento || d.hash,
                nome: fixEncodingStr(d.nome || d.tipoDocumento || 'Documento'),
                tipoDocumento: fixEncodingStr(d.tipoDocumento || d.nome || ''),
                tipoId: d.tipoId || d.tipoDocumentoId || null,
                nivelSigilo: d.nivelSigilo || null,
                dataJuntada: d.dataJuntada || null,
                signatarios: d.signatarios || [],
              }))

              const details = {
                codigo: codigo,
                orgaoJulgador: orgaoJulgador,
                classe: caseData.classe?.nome || '',
                documentos: normalizedDocs,
                complementos: mov.complementosTabelados || mov.complementos || [],
                protocolo: mov.protocolo || null,
                recibo: mov.recibo || null,
                teor: teorText,
                texto: teorText,
                intimacoes: mov.intimacoes || [],
                avisosPendentes: mov.avisosPendentes || null,
                teorComunicacao: mov.teorComunicacao || null,
                ciencia: mov.ciencia || null,
                signatarios: mov.signatarios || [],
                nivelSigilo: mov.nivelSigilo || null,
                magistradoNome: mov.magistradoNome || mov.juiz || null,
                magistradoCpf: mov.magistradoCpf || null,
              }
              newMov.set('movement_details', details)
              newMov.set(
                'document_identifiers',
                normalizedDocs.map((d) => ({
                  id: d.id,
                  nome: d.nome,
                  tipoId: d.tipoId,
                  nivelSigilo: d.nivelSigilo,
                })),
              )

              if (teorText) {
                newMov.set('details', teorText)
              } else if (mov.complementosTabelados && mov.complementosTabelados.length > 0) {
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
        numero_processo: record.getString('case_number'),
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
