routerAdd(
  'POST',
  '/backend/v1/dou/search',
  (e) => {
    const body = e.requestInfo().body || {}
    const q = body.q || ''
    let publishFrom = body.publishFrom || ''
    let publishTo = body.publishTo || ''
    let orgPrin = body.orgPrin || ''

    if (!q) {
      return e.badRequestError('O termo de busca (q) é obrigatório.')
    }

    const logProcess = (etapa, status, msg, metadados = {}) => {
      try {
        const logsCol = $app.findCollectionByNameOrId('logs_processamento')
        const logRec = new Record(logsCol)
        logRec.set('etapa', etapa)
        logRec.set('status', status)
        logRec.set('mensagem', msg)
        logRec.set('data_hora', new Date().toISOString())
        logRec.set('metadados', metadados)
        $app.save(logRec)
      } catch (err) {
        console.log('Log error in dou_search:', err)
      }
    }

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
    const maxPages = 10

    const fetchWithRetry = (url, headers, maxRetries = 3) => {
      let attempt = 0
      while (attempt < maxRetries) {
        try {
          const res = $http.send({
            url: url,
            method: 'GET',
            headers: headers,
            timeout: 15,
          })
          return res
        } catch (err) {
          attempt++
          if (attempt >= maxRetries) {
            throw err
          }
        }
      }
    }

    while (page <= maxPages && hasMore) {
      let url = `https://www.in.gov.br/consulta/-/buscar/dou?q=${encodeURIComponent(q)}&s=do1,do2,do3,doextra&exactDate=personalizado&publishFrom=${fromDDMMYYYY}&publishTo=${toDDMMYYYY}&sortType=0&delta=20&currentPage=${page}`
      if (orgPrin) {
        url += `&orgPrin=${encodeURIComponent(orgPrin)}`
      }

      if (page > 1 && lastScore && lastId && lastDisplayDate) {
        url += `&newPage=${page}&score=${lastScore}&id=${lastId}&displayDate=${lastDisplayDate}`
      }

      try {
        const userAgents = [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        ]
        const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)]

        const headers = {
          'User-Agent': randomUA,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          Referer: 'https://www.in.gov.br/consulta/-/buscar/dou',
          Connection: 'keep-alive',
        }

        const metadadosParams = {
          q,
          s: 'do1,do2,do3,doextra',
          publishFrom: fromDDMMYYYY,
          publishTo: toDDMMYYYY,
          currentPage: page,
          newPage: page > 1 ? page : undefined,
          score: lastScore || undefined,
          id: lastId || undefined,
          displayDate: lastDisplayDate || undefined,
        }

        logProcess('request', 'Processando', `Requisitando página ${page}`, {
          url_consultada: url,
          params_enviados: metadadosParams,
          pagina_atual: page,
        })

        const res = fetchWithRetry(url, headers, 3)

        logProcess(
          'request',
          res.statusCode === 200 ? 'Sucesso' : 'Falha',
          `HTTP Status Code: ${res.statusCode}`,
          {
            url_consultada: url,
            status_http: res.statusCode,
            pagina_atual: page,
          },
        )

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

          logProcess('parsing', 'Processando', `Procurando portlet na resposta da página ${page}`)

          const scriptMatch = html.match(
            /<script[^>]*id="_br_com_seatecnologia_in_buscadou_BuscaDouPortlet_params"[^>]*>([\s\S]*?)<\/script>/,
          )

          if (scriptMatch && scriptMatch[1]) {
            const parsed = JSON.parse(scriptMatch[1].trim())
            if (parsed.jsonArray && parsed.jsonArray.length > 0) {
              const newLastId = parsed.jsonArray[parsed.jsonArray.length - 1].id || ''

              if (newLastId === lastId && lastId !== '') {
                hasMore = false
                logProcess('parsing', 'Sucesso', `Resultados repetidos, parando paginação.`, {
                  quantidade_itens: parsed.jsonArray.length,
                })
              } else {
                scrapeResults = scrapeResults.concat(parsed.jsonArray)
                lastScore = parsed.jsonArray[parsed.jsonArray.length - 1].score || ''
                lastId = newLastId
                lastDisplayDate = parsed.jsonArray[parsed.jsonArray.length - 1].pubDate || ''

                if (parsed.jsonArray.length < 20) hasMore = false

                logProcess(
                  'parsing',
                  'Sucesso',
                  `Extraídos ${parsed.jsonArray.length} itens da página ${page}`,
                  { quantidade_itens: parsed.jsonArray.length },
                )
              }
              scrapeSuccess = true
            } else {
              hasMore = false
              scrapeSuccess = true
              logProcess(
                'parsing',
                'Sucesso',
                `Nenhum item retornado na página ${page} (jsonArray vazio)`,
                { quantidade_itens: 0 },
              )
            }
          } else {
            hasMore = false
            scrapeError = 'ausência do portlet na resposta HTTP 200'
            logProcess('parsing', 'Falha', 'falha de parsing: ' + scrapeError)
          }
        } else if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 429) {
          hasMore = false
          scrapeError = `bloqueio por origem (HTTP ${res.statusCode})`
          logProcess('request', 'Falha', scrapeError, { status_http: res.statusCode })
        } else {
          hasMore = false
          scrapeError = `Falha inesperada (HTTP ${res.statusCode})`
          logProcess('request', 'Falha', scrapeError, { status_http: res.statusCode })
        }
      } catch (err) {
        hasMore = false
        scrapeError = String(err)
        logProcess('request', 'Falha', 'Erro de conexão/timeout: ' + scrapeError)
      }
      page++
    }

    let results = []
    if (scrapeSuccess && scrapeResults.length > 0) {
      logProcess(
        'normalization',
        'Processando',
        `Normalizando ${scrapeResults.length} registros...`,
      )

      const uniqueUrls = new Set()

      for (const item of scrapeResults) {
        if (item.urlTitle && uniqueUrls.has(item.urlTitle)) {
          continue
        }
        if (item.urlTitle) uniqueUrls.add(item.urlTitle)

        let cleanText = (item.content || '').replace(/<[^>]*>?/gm, '').trim()
        let cleanTitle = (item.title || item.artType || '').replace(/<[^>]*>?/gm, '').trim()

        let pubDateStr = item.pubDate || fromDDMMYYYY
        if (pubDateStr.includes('/')) {
          const parts = pubDateStr.split('/')
          if (parts.length === 3) pubDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`
        }
        if (!pubDateStr.includes('T') && !pubDateStr.includes(':')) {
          pubDateStr += 'T00:00:00.000Z'
        }

        const urlTitle = item.urlTitle ? `https://www.in.gov.br/web/dou/-/${item.urlTitle}` : ''

        let org_principal = ''
        let org_subordinada = ''
        if (item.hierarchyStr) {
          const parts = item.hierarchyStr.split('-').map((p) => p.trim())
          if (parts.length > 0) org_principal = parts[0]
          if (parts.length > 1) org_subordinada = parts.slice(1).join(' - ')
        }

        let normalizedArtType = item.artType || 'Publicação'

        results.push({
          title: cleanTitle,
          content: cleanText,
          pubName: item.pubName || 'DOU',
          artType: normalizedArtType,
          urlTitle: urlTitle,
          pubDate: pubDateStr,
          editionNumber: String(item.editionNumber || ''),
          numberPage: String(item.numberPage || ''),
          hierarchyStr: item.hierarchyStr || '',
          orgao_principal: org_principal,
          organizacao_subordinada: org_subordinada,
          source: 'DOU_SCRAPING',
        })
      }

      logProcess(
        'normalization',
        'Sucesso',
        `Normalização concluída. Total de itens únicos: ${results.length}`,
        { quantidade_itens: results.length },
      )
    }

    return e.json(200, {
      success: scrapeSuccess || results.length > 0,
      source: 'DOU_SCRAPING',
      total: results.length,
      data: results,
      message: scrapeError || (results.length > 0 ? 'Sucesso' : 'Nenhum resultado encontrado'),
    })
  },
  $apis.requireAuth(),
)
