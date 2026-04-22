routerAdd(
  'GET',
  '/backend/v1/sync/case/{caseId}',
  (e) => {
    const caseId = e.request.pathValue('caseId')

    let c
    try {
      c = $app.findRecordById('legal_cases', caseId)
    } catch (_) {
      return e.notFoundError('Processo não encontrado')
    }

    let caseNumberStr = c.getString('case_number') || ''
    let caseNumberDigits = caseNumberStr.replace(/\D/g, '')
    if (caseNumberDigits.length !== 20) {
      return e.badRequestError(
        'Número de processo inválido. O número deve conter exatamente 20 dígitos (Padrão CNJ).',
      )
    }

    let newCount = 0

    try {
      const res = $http.send({
        url: `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=${caseNumberDigits}`,
        method: 'GET',
        headers: {},
        timeout: 15,
      })

      if (res.statusCode !== 200) {
        c.set('sync_status', 'error')
        c.set('last_sync_attempt', new Date().toISOString())
        try {
          $app.saveNoValidate(c)
        } catch (_) {}
        return e.badRequestError('Processo não encontrado ou serviço PJe indisponível no momento.')
      }

      let items = []
      if (res.json && Array.isArray(res.json)) items = res.json
      else if (res.json && res.json.items && Array.isArray(res.json.items)) items = res.json.items

      if (!items || items.length === 0) {
        c.set('sync_status', 'error')
        c.set('last_sync_attempt', new Date().toISOString())
        try {
          $app.saveNoValidate(c)
        } catch (_) {}
        return e.badRequestError('Processo não encontrado ou serviço PJe indisponível no momento.')
      }

      const court = items[0].siglaTribunal || ''
      if (court) {
        c.set('court', court.toLowerCase())
        c.set('court_alias', court.toLowerCase())
      }

      const allParties = new Set()
      items.forEach((item) => {
        if (Array.isArray(item.destinatarios)) {
          item.destinatarios.forEach((d) => {
            if (d.nome) allParties.add(d.nome)
          })
        }
      })
      if (allParties.size > 0) {
        c.set('parties', Array.from(allParties).join(' x '))
      }

      c.set('updated', new Date().toISOString())
      c.set('sync_status', 'updated')
      c.set('last_sync_attempt', new Date().toISOString())

      try {
        $app.save(c)
      } catch (err) {
        console.log('Failed to update case', err)
      }

      for (const item of items) {
        const externalIdRaw = item.id?.toString() || item.hash || ''
        const externalId = externalIdRaw ? `pje-${externalIdRaw}` : ''

        if (!externalId) continue

        let movRec
        try {
          movRec = $app.findFirstRecordByData('case_movements', 'external_id', externalId)
          continue
        } catch (_) {
          const movCol = $app.findCollectionByNameOrId('case_movements')
          movRec = new Record(movCol)
          movRec.set('case', c.id)
        }

        let evtDate = item.dataDisponibilizacao
        if (!evtDate) evtDate = new Date().toISOString()
        movRec.set('event_date', evtDate)

        movRec.set('description', item.tipoComunicacao || 'Comunicação PJe')
        movRec.set('source', 'PJe')
        movRec.set('details', item.texto || '')
        movRec.set('external_id', externalId)
        movRec.set('movement_details', item)
        movRec.set('organization', c.getString('organization'))

        try {
          $app.save(movRec)
          newCount++
        } catch (saveErr) {
          console.log('Error saving pje communication', saveErr)
        }
      }
    } catch (err) {
      console.log('Error syncing case', err)
      c.set('sync_status', 'error')
      c.set('last_sync_attempt', new Date().toISOString())
      try {
        $app.saveNoValidate(c)
      } catch (_) {}
      return e.internalServerError('Ocorreu um erro inesperado ao se comunicar com o tribunal.')
    }

    return e.json(200, { success: true, new_communications: newCount })
  },
  $apis.requireAuth(),
)
