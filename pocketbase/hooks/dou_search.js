routerAdd(
  'POST',
  '/backend/v1/dou/search',
  (e) => {
    const body = e.requestInfo().body || {}
    const q = body.q || ''
    let publishFrom = body.publishFrom || ''
    let publishTo = body.publishTo || ''
    let orgPrin = body.orgPrin || ''
    let artType = body.artType || ''

    if (!q) {
      return e.badRequestError('O termo de busca (q) é obrigatório.')
    }

    const queryKey = $security.md5(q + publishFrom + publishTo + orgPrin + artType)

    const logsCol = $app.findCollectionByNameOrId('logs_processamento')
    const pubDouCol = $app.findCollectionByNameOrId('publicacoes_dou')

    const logProcess = (etapa, status, msg, source = '') => {
      try {
        const logRec = new Record(logsCol)
        logRec.set('etapa', etapa)
        logRec.set('status', status)
        logRec.set('mensagem', source ? `${msg} | Source: ${source}` : msg)
        logRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
        $app.save(logRec)
      } catch (err) {}
    }

    logProcess('Busca Ativa DOU', 'Iniciada', `Buscando por: ${q}`)

    // 1. Cache
    try {
      const cacheRec = $app.findFirstRecordByData('dou_search_cache', 'query_key', queryKey)
      if (new Date(cacheRec.get('expires_at')) > new Date()) {
        logProcess('Busca Ativa DOU', 'Concluída', 'Retornado do Cache', 'CACHE')
        return e.json(200, {
          success: true,
          source: 'CACHE',
          total: cacheRec.get('payload').length,
          data: cacheRec.get('payload'),
        })
      }
    } catch (_) {}

    // 2. Reprocessing Queue Check
    let skipRemote = false
    try {
      const qRec = $app.findFirstRecordByData('dou_reprocessing_queue', 'query_key', queryKey)
      const status = qRec.get('status')
      if (
        status === 'pending' ||
        status === 'processing' ||
        (status === 'failed' && qRec.get('retry_count') >= 5)
      ) {
        skipRemote = true
      }
    } catch (_) {}

    let results = []
    let sourceUsed = ''

    // 3. Local Database Search
    let filter = `texto_normalizado ~ "${q.toLowerCase().replace(/"/g, '')}"`
    if (publishFrom) filter += ` && data_publicacao >= "${publishFrom} 00:00:00"`
    if (publishTo) filter += ` && data_publicacao <= "${publishTo} 23:59:59"`
    if (orgPrin) filter += ` && orgao ~ "${orgPrin}"`
    if (artType) filter += ` && artType ~ "${artType}"`

    try {
      const localRecords = $app.findRecordsByFilter(
        'publicacoes_dou',
        filter,
        '-data_publicacao',
        50,
        0,
      )
      if (localRecords.length > 0) {
        sourceUsed = 'LOCAL_DB'
        results = localRecords.map((r) => ({
          id: r.id,
          title: r.get('titulo'),
          content: r.get('texto_bruto'),
          pubName: r.get('orgao'),
          artType: r.get('artType') || r.get('secao'),
          urlTitle: r.get('url_origem'),
          pubDate: r.get('data_publicacao'),
          editionNumber: r.get('editionNumber'),
          numberPage: r.get('numberPage'),
          hierarchyStr: r.get('hierarchyStr'),
          source: 'LOCAL_DB',
        }))
      }
    } catch (err) {}

    const updateQueue = (statusStr, errorMsg) => {
      try {
        let qRec
        try {
          qRec = $app.findFirstRecordByData('dou_reprocessing_queue', 'query_key', queryKey)
        } catch (_) {
          const col = $app.findCollectionByNameOrId('dou_reprocessing_queue')
          qRec = new Record(col)
          qRec.set('query_key', queryKey)
          qRec.set('params', body)
          qRec.set('retry_count', 0)
        }
        qRec.set('status', statusStr)
        qRec.set('error_message', errorMsg)
        qRec.set('last_attempt', new Date().toISOString().replace('T', ' ').substring(0, 19))
        if (statusStr === 'failed') {
          qRec.set('retry_count', qRec.get('retry_count') + 1)
        }
        $app.save(qRec)
      } catch (err) {}
    }

    // 4. Remote Ingestion
    if (results.length === 0 && !skipRemote) {
      let today = new Date().toISOString().split('T')[0]
      let fromDate = publishFrom || today
      let toDate = publishTo || today
      let fromDDMMYYYY = fromDate.split('-').reverse().join('/')
      let toDDMMYYYY = toDate.split('-').reverse().join('/')

      let page = 1
      let hasMore = true
      let lastScore = ''
      let lastId = ''
      let lastDisplayDate = ''
      let scrapeResults = []
      let scrapeSuccess = false
      let scrapeError = ''

      while (page <= 5 && hasMore) {
        let url = `https://www.in.gov.br/consulta/-/buscar/dou?q=${encodeURIComponent(q)}&s=do1,do2,do3,doextra&exactDate=personalizado&publishFrom=${fromDDMMYYYY}&publishTo=${toDDMMYYYY}&sortType=0&delta=20&currentPage=${page}&orgPrin=${encodeURIComponent(orgPrin)}`

        if (page > 1 && lastScore && lastId && lastDisplayDate) {
          url += `&newPage=${page}&score=${lastScore}&id=${lastId}&displayDate=${lastDisplayDate}`
        }

        try {
          const res = $http.send({
            url: url,
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
              'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
              Referer: 'https://www.in.gov.br/consulta/-/buscar/dou',
              'Accept-Encoding': 'identity',
            },
            timeout: 15,
          })

          if (res.statusCode === 200) {
            let html = ''
            if (typeof res.body === 'string') {
              html = res.body
            } else if (res.body) {
              let bytes = new Uint8Array(res.body)
              let chunk = []
              for (let i = 0; i < bytes.length; i += 8000) {
                let end = i + 8000 > bytes.length ? bytes.length : i + 8000
                chunk.push(String.fromCharCode.apply(null, bytes.subarray(i, end)))
              }
              let latin1 = chunk.join('')
              try {
                html = decodeURIComponent(escape(latin1))
              } catch (e) {
                html = latin1
              }
            }

            const scriptMatch = html.match(
              /<script[^>]*id="_br_com_seatecnologia_in_buscadou_BuscaDouPortlet_params"[^>]*>([\s\S]*?)<\/script>/,
            )
            if (scriptMatch && scriptMatch[1]) {
              const parsed = JSON.parse(scriptMatch[1].trim())
              if (parsed.jsonArray && parsed.jsonArray.length > 0) {
                scrapeResults = scrapeResults.concat(parsed.jsonArray)
                const lastItem = parsed.jsonArray[parsed.jsonArray.length - 1]
                lastScore = lastItem.score || ''
                lastId = lastItem.id || ''
                lastDisplayDate = lastItem.pubDate || ''
                if (parsed.jsonArray.length < 20) hasMore = false
                scrapeSuccess = true
              } else {
                hasMore = false
                scrapeSuccess = true
              }
            } else {
              hasMore = false
              scrapeError = 'Structure Mismatch: Script tag not found'
            }
          } else {
            hasMore = false
            scrapeError = `HTTP ${res.statusCode}: Blocked Source or Unavailable`
          }
        } catch (err) {
          logProcess('Busca Ativa DOU - Erro Scraping', 'Erro', String(err))
          hasMore = false
          scrapeError = String(err)
        }
        page++
      }

      if (scrapeSuccess && scrapeResults.length > 0) {
        sourceUsed = 'DOU_SCRAPING'
        updateQueue('completed', '')

        results = scrapeResults.map((item) => {
          let cleanText = (item.content || '').replace(/<[^>]*>?/gm, '').trim()
          let pubDateStr = item.pubDate || fromDDMMYYYY
          if (pubDateStr.includes('/')) {
            const parts = pubDateStr.split('/')
            if (parts.length === 3) pubDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`
          }
          if (!pubDateStr.includes(':')) pubDateStr += ' 00:00:00'

          const urlTitle = item.urlTitle ? `https://www.in.gov.br/web/dou/-/${item.urlTitle}` : ''
          const hash = $security.md5(item.title + urlTitle + pubDateStr + cleanText)

          try {
            $app.findFirstRecordByData('publicacoes_dou', 'hash_conteudo', hash)
          } catch (_) {
            try {
              const record = new Record(pubDouCol)
              record.set(
                'titulo',
                (item.title || item.artType || '').replace(/<[^>]*>?/gm, '').trim(),
              )
              record.set('secao', item.artType || 'Seção 1')
              record.set('orgao', item.pubName || 'DOU')
              record.set('texto_bruto', cleanText)
              record.set('texto_normalizado', cleanText.toLowerCase())
              record.set('url_origem', urlTitle)
              record.set('hash_conteudo', hash)
              record.set('fonte_coleta', 'DOU_SCRAPING')
              record.set('data_publicacao', pubDateStr)
              record.set('data_coleta', new Date().toISOString().replace('T', ' ').substring(0, 19))
              record.set('status_processamento', 'bruto')

              record.set('editionNumber', String(item.editionNumber || ''))
              record.set('numberPage', String(item.numberPage || ''))
              record.set('hierarchyStr', item.hierarchyStr || '')
              record.set('artType', item.artType || '')

              $app.save(record)
            } catch (saveErr) {}
          }

          return {
            title: (item.title || item.artType || '').replace(/<[^>]*>?/gm, '').trim(),
            content: cleanText,
            pubName: item.pubName,
            artType: item.artType,
            urlTitle: urlTitle,
            pubDate: pubDateStr,
            editionNumber: item.editionNumber,
            numberPage: item.numberPage,
            hierarchyStr: item.hierarchyStr,
            source: 'DOU_SCRAPING',
          }
        })
      } else if (!scrapeSuccess) {
        updateQueue('failed', scrapeError || 'Parsing Failure')
      }
    }

    // 5. Fallback to Querido Diário
    if (results.length === 0) {
      logProcess('Busca Ativa DOU - Fallback', 'Processando', 'Iniciando busca no Querido Diário')
      try {
        const qdUrl = `https://queridodiario.ok.org.br/api/gazettes?querystring=${encodeURIComponent(q)}&published_since=${publishFrom || new Date().toISOString().split('T')[0]}&published_until=${publishTo || new Date().toISOString().split('T')[0]}&excerpt_size=500`
        const qdRes = $http.send({ url: qdUrl, method: 'GET', timeout: 10 })
        if (qdRes.statusCode === 200 && qdRes.json && qdRes.json.gazettes) {
          sourceUsed = 'QUERIDO_DIARIO'
          results = qdRes.json.gazettes.map((g) => ({
            title: 'Publicação Municipal ' + g.territory_name,
            content: g.excerpts?.[0] || g.excerpt || '',
            pubName: g.territory_name,
            artType: 'Ato Municipal',
            urlTitle: g.url || '',
            pubDate: g.date || publishFrom,
            source: 'QUERIDO_DIARIO',
          }))
        }
      } catch (err) {
        logProcess('Busca Ativa DOU - Fallback Erro', 'Erro', String(err))
      }
    }

    logProcess(
      'Busca Ativa DOU',
      'Concluída',
      `Resultados: ${results.length}`,
      sourceUsed || 'NENHUM',
    )

    // Save Cache if we have results
    if (results.length > 0) {
      try {
        let cacheRec
        try {
          cacheRec = $app.findFirstRecordByData('dou_search_cache', 'query_key', queryKey)
        } catch (_) {
          const col = $app.findCollectionByNameOrId('dou_search_cache')
          cacheRec = new Record(col)
          cacheRec.set('query_key', queryKey)
        }
        cacheRec.set('payload', results)
        let expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 1)
        cacheRec.set('expires_at', expiresAt.toISOString().replace('T', ' ').substring(0, 19))
        $app.save(cacheRec)
      } catch (err) {}
    }

    let finalMessage = 'Sucesso'
    if (results.length === 0) {
      if (skipRemote)
        finalMessage =
          'Source unreachable (Reprocessing queue active or failed max retries) and no local data.'
      else finalMessage = 'No results for this date range / Rate limited.'
    }

    return e.json(200, {
      success: true,
      source: sourceUsed || 'NENHUM',
      total: results.length,
      data: results,
      message: finalMessage,
    })
  },
  $apis.requireAuth(),
)
