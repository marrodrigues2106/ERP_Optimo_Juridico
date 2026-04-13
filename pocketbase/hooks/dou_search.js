routerAdd(
  'POST',
  '/backend/v1/dou/search',
  (e) => {
    const body = e.requestInfo().body || {}
    const q = body.q || ''
    let publishFrom = body.publishFrom || ''
    let publishTo = body.publishTo || ''

    if (!q) {
      return e.badRequestError('O termo de busca (q) é obrigatório.')
    }

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
      } catch (err) {
        console.error('Erro ao salvar log', err)
      }
    }

    logProcess('Busca Ativa DOU', 'Iniciada', `Buscando por: ${q}`)

    let results = []
    let sourceUsed = ''

    // 1. Local Database Search / Cache Layer
    let filter = `texto_normalizado ~ "${q.toLowerCase().replace(/"/g, '')}"`
    if (publishFrom) filter += ` && data_publicacao >= "${publishFrom} 00:00:00"`
    if (publishTo) filter += ` && data_publicacao <= "${publishTo} 23:59:59"`

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

    // 2. Direct DOU Ingestion (if local is empty)
    if (results.length === 0) {
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

      while (page <= 5 && hasMore) {
        let url = `https://www.in.gov.br/consulta/-/buscar/dou?q=${encodeURIComponent(q)}&s=do1,do2,do3,doextra&exactDate=personalizado&publishFrom=${fromDDMMYYYY}&publishTo=${toDDMMYYYY}&sortType=0&delta=20&currentPage=${page}&orgPrin=`

        if (page > 1 && lastScore && lastId && lastDisplayDate) {
          url += `&newPage=${page}&score=${lastScore}&id=${lastId}&displayDate=${lastDisplayDate}`
        }

        try {
          const res = $http.send({
            url: url,
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0' },
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
            }
          } else {
            hasMore = false
          }
        } catch (err) {
          logProcess('Busca Ativa DOU - Erro Scraping', 'Erro', String(err))
          hasMore = false
        }
        page++
      }

      if (scrapeSuccess && scrapeResults.length > 0) {
        sourceUsed = 'DOU_SCRAPING'
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
              record.set('titulo', item.title || item.artType)
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
            } catch (saveErr) {
              console.error('Erro ao salvar pub dou', saveErr)
            }
          }

          return {
            title: item.title || item.artType,
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
      }

      // 3. Fallback to Querido Diário
      if (!scrapeSuccess && results.length === 0) {
        logProcess('Busca Ativa DOU - Fallback', 'Processando', 'Iniciando busca no Querido Diário')
        try {
          const qdUrl = `https://queridodiario.ok.org.br/api/gazettes?querystring=${encodeURIComponent(q)}&published_since=${fromDate}&published_until=${toDate}&excerpt_size=500`
          const qdRes = $http.send({ url: qdUrl, method: 'GET', timeout: 10 })
          if (qdRes.statusCode === 200 && qdRes.json && qdRes.json.gazettes) {
            sourceUsed = 'QUERIDO_DIARIO'
            results = qdRes.json.gazettes.map((g) => ({
              title: 'Publicação Municipal ' + g.territory_name,
              content: g.excerpts?.[0] || g.excerpt || '',
              pubName: g.territory_name,
              artType: 'Ato Municipal',
              urlTitle: g.url || '',
              pubDate: g.date || fromDate,
              source: 'QUERIDO_DIARIO',
            }))
          }
        } catch (err) {
          logProcess('Busca Ativa DOU - Fallback Erro', 'Erro', String(err))
        }
      }
    }

    logProcess('Busca Ativa DOU', 'Concluída', `Resultados: ${results.length}`, sourceUsed)

    return e.json(200, {
      success: true,
      source: sourceUsed || 'NENHUM',
      total: results.length,
      data: results,
    })
  },
  $apis.requireAuth(),
)
