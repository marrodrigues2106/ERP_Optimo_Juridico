cronAdd('pje_terms_sync_daily', '0 5 * * *', () => {
  const terms = $app.findRecordsByFilter('termos_monitorados', 'ativo = true', '', 1000, 0)

  for (const t of terms) {
    const termStr = t.getString('termo')
    const tipo = t.getString('tipo_termo')
    if (!termStr) continue

    let url = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao?'

    if (tipo === 'OAB') {
      url += `numeroOab=${encodeURIComponent(termStr)}`
    } else if (tipo === 'CPF') {
      url += `documento=${encodeURIComponent(termStr.replace(/\D/g, ''))}`
    } else if (tipo === 'Nome Parte') {
      url += `nomeParte=${encodeURIComponent(termStr)}`
    } else if (tipo === 'Nome Advogado') {
      url += `nomeAdvogado=${encodeURIComponent(termStr)}`
    } else {
      continue
    }

    let today = new Date()
    today.setDate(today.getDate() - 3)
    let dataIni = today.toISOString().split('T')[0]
    let dataFim = new Date().toISOString().split('T')[0]
    url += `&dataDisponibilizacaoInicio=${dataIni}&dataDisponibilizacaoFim=${dataFim}`

    let res
    try {
      res = $http.send({
        url: url,
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeout: 15,
      })
    } catch (err) {
      try {
        const log = new Record($app.findCollectionByNameOrId('system_logs'))
        log.set('level', 'error')
        log.set('module', 'PJe Terms Sync')
        log.set('message', 'Erro ao consultar PJe API por termo')
        log.set('details', { url, error: err.message })
        $app.saveNoValidate(log)
      } catch (e) {}
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
        `${item.numeroProcesso}-${item.dataDisponibilizacao}`
      try {
        $app.findFirstRecordByData('pje_communications', 'numeroComunicacao', String(commId))
        continue
      } catch (_) {}

      const pjeCol = $app.findCollectionByNameOrId('pje_communications')
      const record = new Record(pjeCol)
      record.set(
        'numeroProcesso',
        item.numeroProcesso || item.numero_processo || item.processo || '',
      )
      record.set(
        'dataDisponibilizacao',
        item.dataDisponibilizacao || item.data_disponibilizacao || item.data || '',
      )
      record.set('texto', item.texto || item.conteudo || '')
      record.set('tipoComunicacao', item.tipoComunicacao || 'Comunicação')
      record.set('siglaTribunal', item.siglaTribunal || '')
      record.set('meio', item.meio || '')
      record.set('numeroComunicacao', String(commId))
      record.set('destinatarios', item.destinatarios || [])
      record.set('advogados', item.advogados || [])
      record.set('is_read', false)
      $app.save(record)

      const uid = t.getString('usuario_id')
      if (uid) {
        try {
          const notifCol = $app.findCollectionByNameOrId('notifications')
          const notif = new Record(notifCol)
          notif.set('user_id', uid)
          notif.set('numero_processo', item.numeroProcesso || '')
          notif.set(
            'message',
            `Nova comunicação PJe encontrada para o termo: ${termStr} (${item.numeroProcesso || 'Sem número'})`,
          )
          $app.save(notif)
        } catch (e) {}
      }
    }
  }
})
