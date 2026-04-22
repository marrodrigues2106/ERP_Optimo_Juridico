routerAdd(
  'POST',
  '/backend/v1/sync-followed',
  (e) => {
    const userId = e.auth?.id
    if (!userId) throw new UnauthorizedError('Authentication required')

    let body = {}
    try {
      body = e.requestInfo().body
    } catch (_) {}

    let targetNumbers = []
    let targetCases = []

    if (body && body.caseIds && Array.isArray(body.caseIds) && body.caseIds.length > 0) {
      for (const cid of body.caseIds) {
        try {
          const c = $app.findRecordById('legal_cases', cid)
          const num = c.getString('case_number')
          if (num) {
            targetNumbers.push(num)
            targetCases.push(c)
          }
        } catch (_) {}
      }
    } else if (body && body.caseId) {
      try {
        const c = $app.findRecordById('legal_cases', body.caseId)
        const num = c.getString('case_number')
        if (num) {
          targetNumbers.push(num)
          targetCases.push(c)
        }
      } catch (_) {}
    } else {
      let followed = []
      try {
        followed = $app.findRecordsByFilter('followed_processes', `user_id = '${userId}'`, '', 0, 0)
      } catch (_) {}

      for (const f of followed) {
        const num = f.getString('numero_processo')
        if (num) {
          if (!targetNumbers.includes(num)) {
            targetNumbers.push(num)
            try {
              const c = $app.findFirstRecordByFilter('legal_cases', `case_number = '${num}'`)
              targetCases.push(c)
            } catch (_) {}
          }
        }
      }
    }

    if (targetNumbers.length === 0)
      return e.json(200, { message: 'Nenhum processo para sincronizar', newCount: 0 })

    let totalNewCount = 0
    const resultsCol = $app.findCollectionByNameOrId('results')
    const searchesCol = $app.findCollectionByNameOrId('searches')
    const notifCol = $app.findCollectionByNameOrId('notifications')
    const movementsCol = $app.findCollectionByNameOrId('case_movements')

    let baseUrl = 'https://comunicaapi.pje.jus.br/api/v1'
    try {
      const setting = $app.findFirstRecordByData('settings', 'key', 'baseUrl')
      if (setting.getString('value')) {
        baseUrl = setting.getString('value')
      }
    } catch (_) {}

    for (const c of targetCases) {
      c.set('pje_sync_status', 'syncing')
      try {
        $app.saveNoValidate(c)
      } catch (_) {}
    }

    for (let i = 0; i < targetNumbers.length; i++) {
      const numeroProcesso = targetNumbers[i]
      const currentCase = targetCases.find((c) => c.getString('case_number') === numeroProcesso)

      let page = 1
      let hasMore = true
      let processNewCount = 0
      let totalItems = 0
      let successSync = false

      const searchRec = new Record(searchesCol)
      searchRec.set('term', `numeroProcesso:${numeroProcesso}`)
      searchRec.set('search_type', 'comunica_pje_sync')
      searchRec.set('status', 'pending')
      try {
        $app.saveNoValidate(searchRec)
      } catch (_) {}

      while (hasMore) {
        const url = `${baseUrl}/comunicacao?numeroProcesso=${numeroProcesso.replace(/\D/g, '')}&pagina=${page}&itensPorPagina=100`

        const res = $http.send({
          url: url,
          method: 'GET',
          headers: { Accept: 'application/json' },
          timeout: 30,
        })

        if (res.statusCode === 200 && res.json) {
          successSync = true
          const items = Array.isArray(res.json.items)
            ? res.json.items
            : Array.isArray(res.json)
              ? res.json
              : []

          if (items.length === 0) {
            hasMore = false
            break
          }

          totalItems += items.length

          for (const item of items) {
            const hash = item.hash || item.numeroComunicacao || item.id
            if (!hash) continue

            let isNew = false
            try {
              $app.findFirstRecordByData('case_movements', 'external_id', 'pje_' + hash)
            } catch (_) {
              isNew = true
              try {
                const r = new Record(resultsCol)
                if (searchRec.id) r.set('search_id', searchRec.id)
                if (currentCase) r.set('legal_case', currentCase.id)
                r.set('sigla_tribunal', item.siglaTribunal)
                r.set('tipo_comunicacao', item.tipoComunicacao)
                r.set('nome_orgao', item.nomeOrgao)
                r.set('texto', item.texto)
                r.set('numero_processo', item.numeroProcesso)
                r.set('meio', item.meio)
                r.set('tipo_documento', item.tipoDocumento)
                r.set('nome_classe', item.classe || item.nomeClasse)
                r.set(
                  'data_disponibilizacao',
                  item.data_disponibilizacao || item.dataDisponibilizacao,
                )
                r.set('numero_comunicacao', item.numeroComunicacao)
                r.set('link', item.link)
                r.set('hash_comunicacao', hash)
                r.set('status_comunicacao', item.status)
                r.set('raw_json', item)
                $app.saveNoValidate(r)
              } catch (err) {}
            }

            if (currentCase && isNew) {
              try {
                const m = new Record(movementsCol)
                m.set('case', currentCase.id)
                m.set(
                  'event_date',
                  item.data_disponibilizacao ||
                    item.dataDisponibilizacao ||
                    new Date().toISOString(),
                )
                m.set('description', item.tipoComunicacao || 'Comunicação PJe')
                m.set('source', 'PJe')
                m.set('details', item.texto || item.teor || '')
                m.set('external_id', 'pje_' + hash)
                const orgId = currentCase.getString('organization')
                if (orgId) m.set('organization', orgId)

                m.set('movement_details', {
                  texto: item.texto || item.teor,
                  orgaoJulgador: item.nomeOrgao,
                  meio: item.meio,
                  tipoDocumento: item.tipoDocumento,
                  link: item.link,
                  numeroComunicacao: item.numeroComunicacao,
                })

                $app.saveNoValidate(m)
                processNewCount++
              } catch (err) {}
            }
          }

          if (items.length < 100) {
            hasMore = false
          } else {
            page++
          }
        } else {
          hasMore = false
        }
      }

      if (successSync) {
        searchRec.set('status', 'success')
        searchRec.set('business_status', 'completed')
        searchRec.set('results_count', totalItems)
        searchRec.set('message', 'Unified sync (historical)')
        try {
          $app.saveNoValidate(searchRec)
        } catch (_) {}

        if (processNewCount > 0) {
          totalNewCount += processNewCount
          const notif = new Record(notifCol)
          notif.set('user_id', userId)
          notif.set('numero_processo', numeroProcesso)
          notif.set(
            'message',
            `Foram encontradas ${processNewCount} novas comunicações para o processo ${numeroProcesso}.`,
          )
          notif.set('is_read', false)
          try {
            $app.saveNoValidate(notif)
          } catch (_) {}
        }

        if (currentCase) {
          currentCase.set('pje_last_sync', new Date().toISOString())
          currentCase.set('pje_sync_status', 'success')
          try {
            $app.saveNoValidate(currentCase)
          } catch (_) {}
        }
      } else {
        if (currentCase) {
          currentCase.set('pje_last_sync', new Date().toISOString())
          currentCase.set('pje_sync_status', 'error')
          try {
            $app.saveNoValidate(currentCase)
          } catch (_) {}
        }
      }
    }

    return e.json(200, { message: 'Sync completed', newCount: totalNewCount })
  },
  $apis.requireAuth(),
)
