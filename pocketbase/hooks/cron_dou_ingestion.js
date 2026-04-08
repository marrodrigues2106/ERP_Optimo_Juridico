cronAdd('dou_ingestion_daily', '0 3 * * *', () => {
  console.log('[DOU] Starting advanced automated ingestion...')

  const pubDou = $app.findCollectionByNameOrId('publicacoes_dou')
  const logs = $app.findCollectionByNameOrId('logs_processamento')

  const logProcess = (etapa, status, msg) => {
    try {
      const logRec = new Record(logs)
      logRec.set('etapa', etapa)
      logRec.set('status', status)
      logRec.set('mensagem', msg)
      logRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
      $app.save(logRec)
    } catch (e) {
      console.error('Log error', e)
    }
  }

  try {
    const terms = $app.findRecordsByFilter('termos_monitorados', 'ativo = true', '', 100, 0)
    if (terms.length === 0) return

    const today = new Date().toISOString().split('T')[0]

    for (let t of terms) {
      const termStr = t.get('termo')

      // 1. Official IN API (DOU)
      let douResults = []
      try {
        let page = 1
        let hasMore = true
        while (page <= 2 && hasMore) {
          // max 2 pages to prevent timeout in hooks
          const res = $http.send({
            url: `https://in.gov.br/api/search?q=${encodeURIComponent(termStr)}&dataInicio=${today}&dataFim=${today}&page=${page}`,
            method: 'GET',
            timeout: 10,
          })
          if (res.statusCode === 200 && res.json && res.json.results) {
            douResults = douResults.concat(res.json.results)
            if (res.json.results.length < 20) hasMore = false
          } else {
            hasMore = false
          }
          page++
        }
      } catch (e) {
        console.error('IN API error', e)
      }

      // 2. Querido Diário API (QD)
      let qdResults = []
      try {
        const qdRes = $http.send({
          url: `https://queridodiario.ok.org.br/api/gazettes?querystring=${encodeURIComponent(termStr)}&published_since=${today}&excerpt_size=400&number_of_excerpts=1`,
          method: 'GET',
          timeout: 10,
        })
        if (qdRes.statusCode === 200 && qdRes.json && qdRes.json.gazettes) {
          qdResults = qdRes.json.gazettes
        }
      } catch (e) {
        console.error('QD API error', e)
      }

      logProcess(
        'Coleta DOU/QD',
        'Info',
        `Termo: ${termStr}. Resultados DOU: ${douResults.length}, QD: ${qdResults.length}`,
      )

      // Process DOU
      for (let item of douResults) {
        const hash = $security.md5(item.title + item.url + today)
        try {
          $app.findFirstRecordByData('publicacoes_dou', 'hash_conteudo', hash)
          continue
        } catch (_) {}

        const cleanText = (item.text || '').replace(/<[^>]*>?/gm, '').trim()
        const record = new Record(pubDou)
        record.set('titulo', item.title || 'Publicação')
        record.set('secao', item.section || 'Seção 1')
        record.set('orgao', item.agency || 'DOU')
        record.set('texto_bruto', cleanText)
        record.set('url_origem', item.url || '')
        record.set('hash_conteudo', hash)
        record.set('fonte_coleta', 'Official Public Search')
        record.set('data_publicacao', new Date().toISOString().replace('T', ' ').substring(0, 19))
        record.set('data_coleta', new Date().toISOString().replace('T', ' ').substring(0, 19))
        record.set('status_processamento', 'bruto')
        $app.save(record)
      }

      // Process QD
      for (let g of qdResults) {
        const text = g.excerpts && g.excerpts.length > 0 ? g.excerpts[0] : g.excerpt || ''
        const hash = $security.md5(g.territory_name + g.date + text)
        try {
          $app.findFirstRecordByData('publicacoes_dou', 'hash_conteudo', hash)
          continue
        } catch (_) {}

        const cleanText = text.replace(/<[^>]*>?/gm, '').trim()
        const record = new Record(pubDou)
        record.set('titulo', 'Publicação Municipal ' + g.territory_name)
        record.set('secao', 'Municipal')
        record.set('orgao', g.territory_name)
        record.set('texto_bruto', cleanText)
        record.set('url_origem', g.url || '')
        record.set('hash_conteudo', hash)
        record.set('fonte_coleta', 'Querido Diário')
        record.set(
          'data_publicacao',
          g.date
            ? g.date + ' 00:00:00'
            : new Date().toISOString().replace('T', ' ').substring(0, 19),
        )
        record.set('data_coleta', new Date().toISOString().replace('T', ' ').substring(0, 19))
        record.set('status_processamento', 'bruto')
        $app.save(record)
      }
    }
  } catch (e) {
    console.error('[DOU] Error in ingestion cron:', e)
    logProcess('Coleta DOU', 'Erro', String(e))
  }
})
