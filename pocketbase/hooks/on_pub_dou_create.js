onRecordAfterCreateSuccess((e) => {
  const record = e.record
  if (record.get('status_processamento') !== 'bruto') return

  try {
    const texto_bruto = record.get('texto_bruto') || ''
    const texto_normalizado = texto_bruto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

    record.set('texto_normalizado', texto_normalizado)
    record.set('status_processamento', 'normalizado')
    $app.saveNoValidate(record)

    const logs = $app.findCollectionByNameOrId('logs_processamento')
    let logRec = new Record(logs)
    logRec.set('publicacao_id', record.id)
    logRec.set('etapa', 'Normalização')
    logRec.set('status', 'Sucesso')
    logRec.set('mensagem', 'Texto normalizado com sucesso.')
    logRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
    $app.save(logRec)

    const termos = $app.findRecordsByFilter('termos_monitorados', 'ativo = true', '', 1000, 0)
    const ocorrenciasCol = $app.findCollectionByNameOrId('ocorrencias_dou')

    let matchCount = 0
    for (let i = 0; i < termos.length; i++) {
      const t = termos[i]
      const termoStr = (t.get('termo') || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      const tipo = t.get('tipo_termo')

      let isMatch = false
      if (tipo === 'regex') {
        try {
          const regex = new RegExp(t.get('termo'), 'i')
          isMatch = regex.test(texto_bruto)
        } catch (err) {
          console.error('Invalid regex', t.get('termo'))
        }
      } else {
        isMatch = texto_normalizado.includes(termoStr)
      }

      if (isMatch) {
        const occ = new Record(ocorrenciasCol)
        occ.set('publicacao_id', record.id)
        occ.set('termo_id', t.id)
        occ.set('trecho_encontrado', texto_bruto.substring(0, 150) + '...')
        occ.set('contexto_completo', texto_bruto)
        occ.set('data_deteccao', new Date().toISOString().replace('T', ' ').substring(0, 19))
        occ.set('status_alerta', 'pendente')
        occ.set('score_relevancia', 100)
        $app.save(occ)
        matchCount++
      }
    }

    record.set('status_processamento', 'indexado')
    $app.saveNoValidate(record)

    let logRecEnd = new Record(logs)
    logRecEnd.set('publicacao_id', record.id)
    logRecEnd.set('etapa', 'Indexação e Match')
    logRecEnd.set('status', 'Sucesso')
    logRecEnd.set('mensagem', `Processamento concluído. ${matchCount} ocorrências encontradas.`)
    logRecEnd.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
    $app.save(logRecEnd)
  } catch (err) {
    console.error('[DOU] Error processing publication', err)
  }

  e.next()
}, 'publicacoes_dou')
