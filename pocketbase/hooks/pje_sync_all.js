routerAdd(
  'POST',
  '/backend/v1/processos-sync-pje-all',
  (e) => {
    const auth = e.auth
    if (!auth) throw new UnauthorizedError('Auth required')
    const orgId = auth.getString('active_organization')

    const cases = $app.findRecordsByFilter(
      'legal_cases',
      `lifecycle_status = 'Ativo' && deleted_at = "" && organization = '${orgId}'`,
      '+datajud_last_sync',
      15,
      0,
    )

    let totalAdded = 0
    cases.forEach((record) => {
      const num = record.getString('case_number')
      if (!num) return
      const cleanNum = String(num).replace(/\D/g, '')
      if (cleanNum.length !== 20) return
      try {
        const url = 'https://comunica.pje.jus.br/api/v1/comunicacao?numeroProcesso=' + cleanNum
        const res = $http.send({
          url: url,
          method: 'GET',
          headers: { Accept: 'application/json' },
          timeout: 45,
        })

        let data = null
        try {
          data = res.json
        } catch (err) {}

        if (res.statusCode === 200 && data && data.items) {
          const items = data.items
          const movementsCol = $app.findCollectionByNameOrId('case_movements')
          items.forEach((item) => {
            const uniqueStr = record.id + '_' + item.hash
            const extId = item.hash || $security.md5(uniqueStr)
            try {
              $app.findFirstRecordByFilter('case_movements', `external_id = '${extId}'`)
            } catch (_) {
              const mov = new Record(movementsCol)
              mov.set('case', record.id)
              mov.set('event_date', item.dataDisponibilizacao || new Date().toISOString())
              mov.set('description', item.tipoComunicacao || 'Comunicação PJe')
              mov.set('details', item.texto || '')
              mov.set('source', 'PJe')
              mov.set('external_id', extId)
              mov.set('organization', orgId)
              $app.saveNoValidate(mov)
              totalAdded++
            }
          })
          record.set('datajud_sync_status', 'Success')
          record.set('datajud_last_sync', new Date().toISOString())
          $app.saveNoValidate(record)
        }
      } catch (err) {}
    })
    return e.json(200, { success: true, totalAdded })
  },
  $apis.requireAuth(),
)
