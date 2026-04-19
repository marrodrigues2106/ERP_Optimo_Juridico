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

    const num = record.getString('case_number')
    if (!num) throw new BadRequestError('No case number')

    const cleanNum = String(num).replace(/\D/g, '')
    if (cleanNum.length !== 20) throw new BadRequestError('Invalid case number')

    try {
      const url = 'https://comunica.pje.jus.br/api/v1/comunicacao?numeroProcesso=' + cleanNum
      const res = $http.send({
        url: url,
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeout: 30,
      })

      let data = null
      try {
        data = res.json
      } catch (err) {}

      if (res.statusCode === 200 && data && data.items) {
        const items = data.items
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
        throw new InternalServerError('PJe API Error')
      }
    } catch (err) {
      record.set('datajud_sync_status', 'Error')
      $app.saveNoValidate(record)
      throw new InternalServerError(err.message)
    }
  },
  $apis.requireAuth(),
)
