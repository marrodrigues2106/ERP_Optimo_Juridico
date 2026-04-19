routerAdd(
  'POST',
  '/backend/v1/sync-pje/{caseId}',
  (e) => {
    const caseId = e.request.pathValue('caseId')
    const record = $app.findRecordById('legal_cases', caseId)

    const num = record.getString('case_number')
    if (!num) return e.badRequestError('No case number')

    const cleanNum = String(num).replace(/\D/g, '')
    if (cleanNum.length !== 20) return e.badRequestError('Invalid case number')

    try {
      const url = 'https://comunica.pje.jus.br/api/v1/comunicacao?numeroProcesso=' + cleanNum
      const res = $http.send({
        url: url,
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeout: 30,
      })

      if (res.statusCode === 200 && res.json && res.json.items) {
        const items = res.json.items
        const movementsCol = $app.findCollectionByNameOrId('case_movements')
        const orgId = record.getString('organization')
        let added = 0

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

        record.set('datajud_sync_status', 'Success')
        record.set('datajud_last_sync', new Date().toISOString())
        $app.saveNoValidate(record)

        return e.json(200, { success: true, added })
      } else {
        record.set('datajud_sync_status', 'Error')
        $app.saveNoValidate(record)
        return e.internalServerError('PJe API Error')
      }
    } catch (err) {
      record.set('datajud_sync_status', 'Error')
      $app.saveNoValidate(record)
      return e.internalServerError(err.message)
    }
  },
  $apis.requireAuth(),
)
