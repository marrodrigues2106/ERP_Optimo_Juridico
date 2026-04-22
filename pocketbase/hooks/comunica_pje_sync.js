routerAdd(
  'POST',
  '/backend/v1/sync-followed',
  (e) => {
    const userId = e.auth?.id
    if (!userId) throw new UnauthorizedError('Authentication required')

    let followed = []
    try {
      followed = $app.findRecordsByFilter('followed_processes', `user_id = '${userId}'`, '', 0, 0)
    } catch (_) {
      followed = []
    }

    if (followed.length === 0) return e.json(200, { message: 'No processes followed', newCount: 0 })

    let apiKey = ''
    try {
      const setting = $app.findFirstRecordByData('settings', 'key', 'apiKey')
      apiKey = setting.getString('value')
    } catch (_) {}
    if (!apiKey && $secrets.has('COMUNICA_PJE_KEY')) apiKey = $secrets.get('COMUNICA_PJE_KEY')

    let totalNewCount = 0
    const resultsCol = $app.findCollectionByNameOrId('results')
    const searchesCol = $app.findCollectionByNameOrId('searches')
    const notifCol = $app.findCollectionByNameOrId('notifications')

    for (const f of followed) {
      const numeroProcesso = f.getString('numero_processo')
      const url = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=${numeroProcesso.replace(/\D/g, '')}`

      const res = $http.send({
        url: url,
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
        timeout: 30,
      })

      if (res.statusCode === 200 && res.json) {
        const items = Array.isArray(res.json.items)
          ? res.json.items
          : Array.isArray(res.json)
            ? res.json
            : []
        let processNewCount = 0

        const searchRec = new Record(searchesCol)
        searchRec.set('term', `numeroProcesso:${numeroProcesso}`)
        searchRec.set('search_type', 'comunica_pje_sync')
        searchRec.set('status', 'success')
        searchRec.set('business_status', 'completed')
        searchRec.set('results_count', items.length)
        searchRec.set('message', 'Manual user sync')
        $app.save(searchRec)

        for (const item of items) {
          const hash = item.hash || item.numeroComunicacao || item.id
          if (!hash) continue

          try {
            $app.findFirstRecordByData('results', 'hash_comunicacao', hash)
          } catch (_) {
            const r = new Record(resultsCol)
            r.set('search_id', searchRec.id)
            r.set('sigla_tribunal', item.siglaTribunal)
            r.set('tipo_comunicacao', item.tipoComunicacao)
            r.set('nome_orgao', item.nomeOrgao)
            r.set('texto', item.texto)
            r.set('numero_processo', item.numeroProcesso)
            r.set('meio', item.meio)
            r.set('tipo_documento', item.tipoDocumento)
            r.set('nome_classe', item.classe || item.nomeClasse)
            r.set('data_disponibilizacao', item.data_disponibilizacao || item.dataDisponibilizacao)
            r.set('numero_comunicacao', item.numeroComunicacao)
            r.set('link', item.link)
            r.set('hash_comunicacao', hash)
            r.set('status_comunicacao', item.status)
            r.set('raw_json', item)
            $app.save(r)
            processNewCount++
          }
        }

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
          $app.save(notif)
        }
      }
    }

    return e.json(200, { message: 'Sync completed', newCount: totalNewCount })
  },
  $apis.requireAuth(),
)
