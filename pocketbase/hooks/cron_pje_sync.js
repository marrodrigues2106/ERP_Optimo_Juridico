function syncActiveCasesForUser(uid) {
  try {
    const collabs = $app.findRecordsByFilter('collaborators', `user = '${uid}'`, '', 10, 0)
    for (const collab of collabs) {
      const collabId = collab.id
      const cases = $app.findRecordsByFilter(
        'legal_cases',
        `lifecycle_status = 'Ativo' && case_number != '' && responsible_collaborator = '${collabId}'`,
        '',
        500,
        0,
      )

      for (const c of cases) {
        const caseNumberStr = c.getString('case_number')
        const caseNumber = caseNumberStr.replace(/\D/g, '')
        if (caseNumber.length < 10) continue

        let res
        try {
          res = $http.send({
            url: `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=${caseNumber}`,
            method: 'GET',
            headers: { Accept: 'application/json' },
            timeout: 15,
          })
        } catch (err) {
          continue
        }

        if (res.statusCode !== 200 || !res.json) continue

        let items = []
        if (Array.isArray(res.json)) items = res.json
        else if (res.json.items && Array.isArray(res.json.items)) items = res.json.items
        else if (res.json.data && Array.isArray(res.json.data)) items = res.json.data

        for (const item of items) {
          const commId =
            item.id ||
            item.numeroComunicacao ||
            item.hash ||
            `${caseNumber}-${item.dataDisponibilizacao}`
          try {
            $app.findFirstRecordByData('pje_communications', 'numeroComunicacao', String(commId))
            continue
          } catch (_) {}

          const pjeCol = $app.findCollectionByNameOrId('pje_communications')
          const record = new Record(pjeCol)
          record.set('numeroProcesso', item.numeroProcesso || caseNumberStr)
          record.set('dataDisponibilizacao', item.dataDisponibilizacao || '')
          record.set('texto', item.texto || item.conteudo || '')
          record.set('tipoComunicacao', item.tipoComunicacao || 'Comunicação')
          record.set('siglaTribunal', item.siglaTribunal || '')
          record.set('meio', item.meio || '')
          record.set('numeroComunicacao', String(commId))
          record.set('destinatarios', item.destinatarios || [])
          record.set('advogados', item.advogados || [])
          record.set('linked_case', c.id)
          record.set('organization', c.getString('organization'))
          record.set('is_read', false)
          $app.save(record)

          const movCol = $app.findCollectionByNameOrId('case_movements')
          const mov = new Record(movCol)
          mov.set('case', c.id)
          let evtDate = item.dataDisponibilizacao
          if (!evtDate || evtDate.length < 10) evtDate = new Date().toISOString()
          mov.set('event_date', evtDate)
          mov.set('description', `Comunicação PJe: ${item.tipoComunicacao || 'Atualização'}`)
          mov.set('source', 'PJe')
          mov.set('details', item.texto || item.conteudo || '')
          mov.set('external_id', String(commId))
          mov.set('movement_details', item)
          mov.set('organization', c.getString('organization'))
          $app.save(mov)

          try {
            const notifCol = $app.findCollectionByNameOrId('notifications')
            const notif = new Record(notifCol)
            notif.set('user_id', uid)
            notif.set('numero_processo', caseNumberStr)
            notif.set('message', `Nova comunicação PJe no processo ${caseNumberStr}`)
            $app.save(notif)
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    $app.logger().error('Error syncing active cases for user', 'uid', uid, 'error', String(e))
  }
}

cronAdd('pje_sync_hourly', '0 * * * *', () => {
  const configs = $app.findRecordsByFilter(
    'configuracoes_alerta',
    `frequencia = 'hourly' && ativo = true`,
    '',
    1000,
    0,
  )
  for (const cfg of configs) {
    const uid = cfg.getString('usuario_id')
    if (uid) syncActiveCasesForUser(uid)
  }
})

cronAdd('pje_sync_daily', '0 0 * * *', () => {
  const configs = $app.findRecordsByFilter(
    'configuracoes_alerta',
    `(frequencia = 'daily' || frequencia = 'diario') && ativo = true`,
    '',
    1000,
    0,
  )
  for (const cfg of configs) {
    const uid = cfg.getString('usuario_id')
    if (uid) syncActiveCasesForUser(uid)
  }
})

cronAdd('pje_sync_weekly', '0 0 * * 0', () => {
  const configs = $app.findRecordsByFilter(
    'configuracoes_alerta',
    `frequencia = 'weekly' && ativo = true`,
    '',
    1000,
    0,
  )
  for (const cfg of configs) {
    const uid = cfg.getString('usuario_id')
    if (uid) syncActiveCasesForUser(uid)
  }
})
