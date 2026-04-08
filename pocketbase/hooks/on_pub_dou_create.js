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

    const termos = $app.findRecordsByFilter('termos_monitorados', 'ativo = true', '', 1000, 0)
    const ocorrenciasCol = $app.findCollectionByNameOrId('ocorrencias_dou')

    let matchCount = 0
    for (let i = 0; i < termos.length; i++) {
      const t = termos[i]
      const termoStr = t.get('termo') || ''
      const tipo = t.get('tipo_termo')

      const termosIgnorados = (t.get('termos_ignorados') || '')
        .split(',')
        .map((s) =>
          s
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, ''),
        )
        .filter((s) => s)

      let isMatch = false
      let matchedKeywords = []

      // Check ignore terms
      let hasIgnore = false
      for (const ign of termosIgnorados) {
        if (texto_normalizado.includes(ign)) {
          hasIgnore = true
          break
        }
      }
      if (hasIgnore) continue

      if (tipo === 'regex') {
        try {
          const regex = new RegExp(termoStr, 'ig')
          const matches = [...texto_bruto.matchAll(regex)]
          if (matches.length > 0) {
            isMatch = true
            matchedKeywords = matches.map((m) => m[0])
          }
        } catch (err) {}
      } else if (tipo === 'frase') {
        const normalTerm = termoStr
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
        if (texto_normalizado.includes(normalTerm)) {
          isMatch = true
          matchedKeywords = [termoStr]
        }
      } else {
        // palavra-chave with logic operators
        const normalTerm = termoStr
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
        const operands = normalTerm.match(/[^&|!()\s]+/g) || []

        let evalExpr = normalTerm
        for (const op of operands) {
          if (!op) continue
          const opMatch = texto_normalizado.includes(op)
          evalExpr = evalExpr.replace(
            new RegExp('\\b' + op + '\\b', 'g'),
            opMatch ? 'true' : 'false',
          )
          if (opMatch) matchedKeywords.push(op)
        }
        evalExpr = evalExpr.replace(/&/g, '&&').replace(/\|/g, '||').replace(/!/g, '!')

        try {
          isMatch = new Function('return ' + evalExpr)()
        } catch (err) {
          isMatch = operands.some((op) => texto_normalizado.includes(op))
        }
      }

      if (isMatch) {
        let firstMatchIdx = -1
        let mainKw = matchedKeywords[0] || ''
        if (mainKw) {
          const kwNorm = mainKw
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
          firstMatchIdx = texto_normalizado.indexOf(kwNorm)
        }
        if (firstMatchIdx === -1) firstMatchIdx = 0

        const start = Math.max(0, firstMatchIdx - 200)
        const end = Math.min(texto_bruto.length, firstMatchIdx + mainKw.length + 200)
        let snippet = texto_bruto.substring(start, end)
        if (start > 0) snippet = '...' + snippet
        if (end < texto_bruto.length) snippet = snippet + '...'

        // Highlight with <%%>
        const uniqueKws = [...new Set(matchedKeywords.map((k) => k.toLowerCase()))]
        for (const kw of uniqueKws) {
          if (!kw) continue
          const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(`(${escapedKw})`, 'gi')
          snippet = snippet.replace(regex, '<%%>$1</%%>')
        }

        const occ = new Record(ocorrenciasCol)
        occ.set('publicacao_id', record.id)
        occ.set('termo_id', t.id)
        occ.set('trecho_encontrado', snippet)
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

    const logs = $app.findCollectionByNameOrId('logs_processamento')
    let logRecEnd = new Record(logs)
    logRecEnd.set('publicacao_id', record.id)
    logRecEnd.set('etapa', 'Indexação e Match Avançado')
    logRecEnd.set('status', 'Sucesso')
    logRecEnd.set('mensagem', `Processamento concluído. ${matchCount} ocorrências encontradas.`)
    logRecEnd.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
    $app.save(logRecEnd)
  } catch (err) {
    console.error('[DOU] Error processing publication', err)
  }

  e.next()
}, 'publicacoes_dou')
