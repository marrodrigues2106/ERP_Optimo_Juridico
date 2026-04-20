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

          const movementDetailsObj = {
            meio: item.meio || '',
            tipoDocumento: item.tipoDocumento || '',
            numeroComunicacao: item.numeroComunicacao || '',
            link: item.link || '',
            destinatarios: item.destinatarios || [],
            hash: item.hash || '',
            orgaoJulgador: item.nomeOrgao || '',
            classe: item.nomeClasse || '',
            protocolo: item.protocolo || null,
            recibo: item.recibo || null,
            ciencia: item.ciencia || null,
            teor: item.teor || item.texto || '',
          }

          try {
            const existing = $app.findFirstRecordByFilter(
              'case_movements',
              `external_id = '${extId}'`,
            )
            let updated = false
            const currDetails = existing.get('movement_details') || {}
            if (JSON.stringify(currDetails) !== JSON.stringify(movementDetailsObj)) {
              existing.set('movement_details', movementDetailsObj)
              updated = true
            }
            if (updated) {
              $app.saveNoValidate(existing)
            }
          } catch (notfound) {
            const mov = new Record(movementsCol)
            mov.set('case', record.id)
            mov.set('event_date', item.dataDisponibilizacao || new Date().toISOString())
            mov.set('description', item.tipoComunicacao || 'Comunicação PJe')
            mov.set('details', item.teor || item.texto || '')
            mov.set('movement_details', movementDetailsObj)
            mov.set('source', 'PJe')
            mov.set('external_id', extId)
            if (orgId) mov.set('organization', orgId)
            $app.saveNoValidate(mov)
          }

          try {
            const resultsCol = $app.findCollectionByNameOrId('results')
            let existingResult = null
            try {
              existingResult = $app.findFirstRecordByFilter(
                'results',
                `hash_comunicacao = '${item.hash}'`,
              )
            } catch (err) {}

            if (existingResult) {
              if (!existingResult.getString('legal_case')) {
                existingResult.set('legal_case', record.id)
                $app.saveNoValidate(existingResult)
              }
            } else {
              const resultRecord = new Record(resultsCol)
              resultRecord.set('legal_case', record.id)
              resultRecord.set('sigla_tribunal', item.siglaTribunal)
              resultRecord.set('tipo_comunicacao', item.tipoComunicacao)
              resultRecord.set('nome_orgao', item.nomeOrgao)
              resultRecord.set('texto', item.teor || item.texto || '')
              resultRecord.set('numero_processo', item.numeroProcesso)
              resultRecord.set('meio', item.meio)
              resultRecord.set('tipo_documento', item.tipoDocumento)
              resultRecord.set('nome_classe', item.nomeClasse)
              resultRecord.set('data_disponibilizacao', item.dataDisponibilizacao)
              resultRecord.set('numero_comunicacao', item.numeroComunicacao)
              resultRecord.set('link', item.link)
              resultRecord.set('hash_comunicacao', item.hash)
              resultRecord.set('status_comunicacao', item.status)
              resultRecord.set('raw_json', item)
              $app.saveNoValidate(resultRecord)
            }
          } catch (resErr) {
            console.log('Error saving result', resErr)
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
