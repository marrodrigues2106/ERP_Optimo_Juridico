cronAdd('pje_sync', '0 * * * *', () => {
  try {
    const cases = $app.findRecordsByFilter(
      'legal_cases',
      "lifecycle_status = 'Ativo' && case_number != ''",
      '',
      200,
      0,
    )

    for (const c of cases) {
      const numeroProcessoRaw = c.getString('case_number')
      const numeroProcesso = numeroProcessoRaw.replace(/\D/g, '')
      if (!numeroProcesso || numeroProcesso.length < 10) continue

      let res
      try {
        res = $http.send({
          url: `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=${numeroProcesso}`,
          method: 'GET',
          headers: { Accept: 'application/json' },
          timeout: 15,
        })
      } catch (err) {
        $app
          .logger()
          .error('Network error calling PJe API', 'case', numeroProcesso, 'error', String(err))
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
          `${numeroProcesso}-${item.dataDisponibilizacao}`

        try {
          $app.findFirstRecordByData('pje_communications', 'numeroComunicacao', String(commId))
          continue
        } catch (_) {}

        const pjeCol = $app.findCollectionByNameOrId('pje_communications')
        const record = new Record(pjeCol)
        record.set('numeroProcesso', item.numeroProcesso || numeroProcessoRaw)
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
        mov.set('details', item.texto || '')
        mov.set('organization', c.getString('organization'))
        $app.save(mov)

        const collabId = c.getString('responsible_collaborator')
        if (collabId) {
          try {
            const collab = $app.findRecordById('collaborators', collabId)
            const userId = collab.getString('user')
            if (userId) {
              const notifCol = $app.findCollectionByNameOrId('notifications')
              const notif = new Record(notifCol)
              notif.set('user_id', userId)
              notif.set('numero_processo', c.getString('case_number'))
              notif.set('message', `Nova comunicação PJe no processo ${c.getString('case_number')}`)
              $app.save(notif)
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    $app.logger().error('Error in PJe sync cron', 'error', String(e))
  }
})
