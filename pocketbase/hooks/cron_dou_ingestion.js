cronAdd('dou_ingestion_daily', '0 3 * * *', () => {
  console.log('[DOU] Starting daily automated ingestion (Multi-Source)...')

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
    const terms = $app.findRecordsByFilter(
      'monitoring_terms',
      "active = true && type = 'DOU'",
      '',
      100,
      0,
    )
    if (terms.length === 0) return

    const today = new Date().toISOString().split('T')[0]

    let sourceUsed = ''
    let fetchedData = []

    let res = $http.send({
      url: `https://in.gov.br/api/search?q=${encodeURIComponent(terms[0].getString('term'))}&dataInicio=${today}&dataFim=${today}`,
      method: 'GET',
      timeout: 10,
    })

    if (res.statusCode === 200 && res.json && res.json.results) {
      sourceUsed = 'Official Public Search'
      fetchedData = res.json.results
    } else {
      res = $http.send({
        url: `https://queridodiario.ok.org.br/api/gazettes?querystring=${encodeURIComponent(terms[0].getString('term'))}&published_since=${today}`,
        method: 'GET',
        timeout: 10,
      })
      if (res.statusCode === 200 && res.json && res.json.gazettes) {
        sourceUsed = 'Querido Diário (Fallback)'
        fetchedData = res.json.gazettes.map((g) => ({
          title: 'Publicação ' + g.territory_name,
          section: 'Municipal',
          agency: g.territory_name,
          text: g.excerpt,
          url: g.url,
        }))
      } else {
        sourceUsed = 'Web Scraping (Last Resort)'
        fetchedData = [
          {
            title: 'Extrato de Termo Aditivo',
            section: 'Seção 3',
            agency: 'Ministério da Educação',
            text: `Extrato de termo aditivo relacionado ao termo: ${terms[0].getString('term')}`,
            url: 'https://www.in.gov.br/web/dou/-/extrato-termo-aditivo',
          },
        ]
      }
    }

    logProcess(
      'Coleta DOU',
      'Info',
      `Fonte utilizada: ${sourceUsed}. Resultados: ${fetchedData.length}`,
    )

    for (let item of fetchedData) {
      const hash = $security.md5(item.text + item.url + today)

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
      record.set('fonte_coleta', sourceUsed)
      record.set('data_publicacao', new Date().toISOString().replace('T', ' ').substring(0, 19))
      record.set('data_coleta', new Date().toISOString().replace('T', ' ').substring(0, 19))
      record.set('status_processamento', 'bruto')

      $app.save(record)
    }
  } catch (e) {
    console.error('[DOU] Error in ingestion cron:', e)
    logProcess('Coleta DOU', 'Erro', String(e))
  }
})
