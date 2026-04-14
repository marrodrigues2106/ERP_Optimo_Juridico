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
        // Ensure ISO 8601 formatting for the timestamp
        logRec.set('data_hora', new Date().toISOString())
        $app.save(logRec)
      } catch (err) {
        console.error('Log error in dou_search:', err)
      }
    }

    logProcess(
      'Busca Ativa DOU',
      'Iniciada',
      `Buscando por: ${q} | Params: ${JSON.stringify(body)}`,
    )

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
        (status === 'failed' && qRec.get('retry_count') >= 3)
      ) {
        skipRemote = true
      }
    } catch (_) {}

    let results = []
    let sourceUsed = ''

    // 3. Local Database Search
    const filterQ = q.toLowerCase().replace(/"/g, '')
    let filter = `(texto_normalizado ~ "${filterQ}" || titulo ~ "${filterQ}")`
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
          orgao_principal: r.get('orgao_principal'),
          organizacao_subordinada: r.get('organizacao_subordinada'),
          source: 'LOCAL_DB',
        }))
      }
    } catch (err) {
      logProcess('Busca Local', 'Erro', String(err))
    }

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
        qRec.set('last_attempt', new Date().toISOString())
        if (statusStr === 'failed') {
          qRec.set('retry_count', qRec.get('retry_count') + 1)
        }
        $app.save(qRec)
      } catch (err) {
        logProcess('Update Queue', 'Erro', String(err))
      }
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
          logProcess(
            'Busca Ativa DOU - Scraping',
            'Processando',
            `Buscando página ${page} na API do DOU... URL: ${url}`,
          )
          const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
          ]
          const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)]

          const res = $http.send({
            url: url,
            method: 'GET',
            headers: {
              'User-Agent': randomUA,
              Accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
              'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
              Referer: 'https://www.in.gov.br/consulta/-/buscar/dou',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'same-origin',
              'Sec-Fetch-User': '?1',
              'Upgrade-Insecure-Requests': '1',
              'Accept-Encoding': 'identity',
            },
            timeout: 15,
          })

          logProcess(
            'Busca Ativa DOU - Scraping HTTP',
            res.statusCode === 200 ? 'Sucesso' : 'Aviso',
            `HTTP Status Code: ${res.statusCode}`,
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

            const scriptMatch = html.match(
              /<script[^>]*id="_br_com_seatecnologia_in_buscadou_BuscaDouPortlet_params"[^>]*>([\s\S]*?)<\/script>/,
            )
            if (scriptMatch && scriptMatch[1]) {
              const parsed = JSON.parse(scriptMatch[1].trim())
              if (parsed.jsonArray && parsed.jsonArray.length > 0) {
                const newLastId = parsed.jsonArray[parsed.jsonArray.length - 1].id || ''
                if (newLastId === lastId && lastId !== '') {
                  hasMore = false
                } else {
                  scrapeResults = scrapeResults.concat(parsed.jsonArray)
                  lastScore = parsed.jsonArray[parsed.jsonArray.length - 1].score || ''
                  lastId = newLastId
                  lastDisplayDate = parsed.jsonArray[parsed.jsonArray.length - 1].pubDate || ''
                  if (parsed.jsonArray.length < 20) hasMore = false
                }
                scrapeSuccess = true
              } else {
                hasMore = false
                scrapeSuccess = true
              }
            } else {
              hasMore = false
              scrapeError = 'Structure Mismatch: Script tag not found'
            }
          } else if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 429) {
            hasMore = false
            scrapeError = `HTTP ${res.statusCode}: Acesso bloqueado pelo firewall do DOU (Unauthorized/Forbidden/Too Many Requests).`
            logProcess('Busca Ativa DOU - Erro Scraping', 'Erro', scrapeError)
          } else if (res.statusCode === 500) {
            hasMore = false
            scrapeError = `HTTP 500: Erro interno no servidor do DOU (Internal Server Error).`
            logProcess('Busca Ativa DOU - Erro Scraping', 'Erro', scrapeError)
          } else {
            hasMore = false
            scrapeError = `HTTP ${res.statusCode}: Resposta inesperada do servidor.`
            logProcess('Busca Ativa DOU - Erro Scraping', 'Erro', scrapeError)
          }
        } catch (err) {
          logProcess('Busca Ativa DOU - Erro Scraping', 'Erro', String(err))
          hasMore = false
          scrapeError = String(err)
        }
        page++
      }

      if (scrapeSuccess && scrapeResults.length > 0) {
        logProcess(
          'Busca Ativa DOU - Tratamento',
          'Processando',
          `Páginas processadas: ${page - 1} | Normalizando e salvando ${scrapeResults.length} registros...`,
        )
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
          const hash = item.urlTitle
            ? $security.md5(item.urlTitle)
            : $security.md5(item.title + urlTitle + pubDateStr + cleanText)

          let exists = false
          try {
            if (item.urlTitle) {
              try {
                $app.findFirstRecordByData('publicacoes_dou', 'url_origem', urlTitle)
                exists = true
              } catch (_) {}
            }
            if (!exists) {
              $app.findFirstRecordByData('publicacoes_dou', 'hash_conteudo', hash)
              exists = true
            }
          } catch (_) {}

          if (!exists) {
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
              record.set('data_coleta', new Date().toISOString())
              record.set('status_processamento', 'bruto')

              record.set('editionNumber', String(item.editionNumber || ''))
              record.set('numberPage', String(item.numberPage || ''))
              record.set('hierarchyStr', item.hierarchyStr || '')
              record.set('artType', item.artType || '')

              let org_principal = ''
              let org_subordinada = ''
              if (item.hierarchyStr) {
                const parts = item.hierarchyStr.split('-').map((p) => p.trim())
                if (parts.length > 0) org_principal = parts[0]
                if (parts.length > 1) org_subordinada = parts.slice(1).join(' - ')
              }
              record.set('orgao_principal', org_principal)
              record.set('organizacao_subordinada', org_subordinada)

              if (e.auth && e.auth.get('active_organization')) {
                record.set('organization', e.auth.get('active_organization'))
              }

              $app.save(record)
            } catch (saveErr) {
              logProcess('Busca Ativa DOU - Salvar', 'Erro', String(saveErr))
            }
          }

          let org_principal = ''
          let org_subordinada = ''
          if (item.hierarchyStr) {
            const parts = item.hierarchyStr.split('-').map((p) => p.trim())
            if (parts.length > 0) org_principal = parts[0]
            if (parts.length > 1) org_subordinada = parts.slice(1).join(' - ')
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
            orgao_principal: org_principal,
            organizacao_subordinada: org_subordinada,
            source: 'DOU_SCRAPING',
          }
        })
      } else if (!scrapeSuccess) {
        updateQueue('failed', scrapeError || 'Parsing Failure')
      }
    }

    // 5. Fallback to Querido Diário
    if (results.length === 0) {
      logProcess(
        'Busca Ativa DOU - Fallback',
        'Aviso',
        'Iniciando busca no Querido Diário devido a falta de resultados ou falha nas etapas anteriores',
      )
      try {
        const qdUrl = `https://queridodiario.ok.org.br/api/gazettes?querystring=${encodeURIComponent(q)}&published_since=${publishFrom || new Date().toISOString().split('T')[0]}&published_until=${publishTo || new Date().toISOString().split('T')[0]}&excerpt_size=500`
        const qdRes = $http.send({ url: qdUrl, method: 'GET', timeout: 10 })

        if (qdRes.statusCode === 403) {
          logProcess(
            'Busca Ativa DOU - Fallback HTTP',
            'Bloqueio Funcional',
            `HTTP Status Code: 403 Forbidden`,
          )
        } else {
          logProcess(
            'Busca Ativa DOU - Fallback HTTP',
            qdRes.statusCode === 200 ? 'Sucesso' : 'Aviso',
            `HTTP Status Code: ${qdRes.statusCode}`,
          )

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
        }
      } catch (err) {
        logProcess('Busca Ativa DOU - Fallback Erro', 'Erro', String(err))
      }
    }

    logProcess(
      'Busca Ativa DOU',
      'Concluída',
      `Total Resultados: ${results.length} | Fonte: ${sourceUsed || 'NENHUM'} | Params: ${JSON.stringify(body)}`,
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
        cacheRec.set('expires_at', expiresAt.toISOString())
        $app.save(cacheRec)
      } catch (err) {
        logProcess('Salvar Cache', 'Erro', String(err))
      }
    }

    let finalMessage = 'Sucesso'
    if (results.length === 0) {
      if (skipRemote)
        finalMessage =
          'Source unreachable (Reprocessing queue active or failed max retries) and no local data.'
      else finalMessage = 'No results for this date range / Rate limited / Blocked (403).'
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
