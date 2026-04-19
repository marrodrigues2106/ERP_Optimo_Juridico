onRecordAfterCreateSuccess((e) => {
  const record = e.record
  const num = record.getString('case_number')
  if (!num) return e.next()

  const cleanNum = String(num).replace(/\D/g, '')
  if (cleanNum.length !== 20) return e.next()

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
          }
        } catch (err) {
          console.log('Error saving mov', err)
        }
      })

      const updatedRecord = $app.findRecordById('legal_cases', record.id)
      updatedRecord.set('datajud_sync_status', 'Success')
      updatedRecord.set('datajud_last_sync', new Date().toISOString())
      $app.saveNoValidate(updatedRecord)
    }
  } catch (err) {
    console.log('Error syncing Comunica PJe', err)
  }
  return e.next()
}, 'legal_cases')
