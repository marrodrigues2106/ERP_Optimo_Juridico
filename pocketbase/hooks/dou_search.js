routerAdd(
  'POST',
  '/backend/v1/dou/search',
  (e) => {
    const parseDateToYYYYMMDD = (dStr) => {
      if (!dStr) return ''
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dStr)) {
        const parts = dStr.split('/')
        return `${parts[2]}-${parts[1]}-${parts[0]}`
      }
      if (/^\d{4}-\d{2}-\d{2}/.test(dStr)) {
        return dStr.substring(0, 10)
      }
      if (/^\d{12,}$/.test(dStr)) {
        try {
          const dateObj = new Date(parseInt(dStr, 10))
          if (!isNaN(dateObj.getTime())) {
            return dateObj.toISOString().split('T')[0]
          }
        } catch (e) {}
      }
      try {
        const dateObj = new Date(dStr)
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString().split('T')[0]
        }
      } catch (e) {}
      return dStr
    }

    const body = e.requestInfo().body || {}
    const q = body.q || ''
    const searchType = body.searchType || 'palavras_chave'
    let publishFrom = body.publishFrom || ''
    let publishTo = body.publishTo || ''
    let orgPrin = body.orgPrin || ''
    let processNumber = body.processNumber || ''
    let oabNumber = body.oabNumber || ''
    let cpfCnpj = body.cpfCnpj || ''
    let douSection = body.douSection || ''
    let fonteColeta = body.fonteColeta || ''

    if (!q) {
      return e.badRequestError('O termo de busca (q) é obrigatório.')
    }
    if (!publishFrom || !publishTo) {
      return e.badRequestError('O período (Data Inicial e Data Final) é obrigatório.')
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

    let fromDDMMYYYY = publishFrom.split('-').reverse().join('/')
    let toDDMMYYYY = publishTo.split('-').reverse().join('/')

    let page = 1
    let hasMore = true
    let lastScore = ''
    let lastId = ''
    let lastDisplayDate = ''
    let scrapeSuccess = false
    let scrapeError = ''
    const maxPages = 50

    let consecutivePagesZeroPassed = 0
    let results = []
    let discardedCount = 0
    let discardReasons = {}
    const uniqueUrls = new Set()

    let qTerm = q.trim().replace(/\s+/g, ' ')
    let qUrl = ''
    if (searchType === 'frase_exata') {
      qUrl = '%22' + qTerm.split(' ').map(encodeURIComponent).join('+') + '%22'
    } else if (searchType === 'regex') {
      let broad = qTerm
        .replace(/[^a-zA-Z0-9À-ÿ\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (!broad) broad = 'União'
      qUrl = broad.split(' ').map(encodeURIComponent).join('+')
    } else {
      qUrl = qTerm.split(' ').map(encodeURIComponent).join('+')
    }

    let sParam = 'do1,do2,do3,doextra'
    if (douSection && douSection !== 'all') {
      sParam = douSection
    }

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
          if (
            res.statusCode === 403 ||
            res.statusCode === 429 ||
            res.statusCode === 502 ||
            res.statusCode === 503 ||
            res.statusCode === 504
          ) {
            attempt++
            if (attempt >= maxRetries) return res
            let start = new Date().getTime()
            while (new Date().getTime() - start < 2000) {} // wait 2s
            continue
          }
          return res
        } catch (err) {
          attempt++
          if (attempt >= maxRetries) {
            throw err
          }
          let start = new Date().getTime()
          while (new Date().getTime() - start < 1000) {} // wait 1s
        }
      }
    }

    let cookies = []
    const getCookieHeader = () => cookies.join('; ')

    while (page <= maxPages && hasMore) {
      let url = `https://www.in.gov.br/consulta/-/buscar/dou?q=${qUrl}&s=${sParam}&exactDate=personalizado&publishFrom=${fromDDMMYYYY}&publishTo=${toDDMMYYYY}&sortType=0&delta=20&currentPage=${page}`
      if (orgPrin) {
        url += `&orgPrin=${encodeURIComponent(orgPrin)}`
      }

      if (page > 1 && lastScore && lastId && lastDisplayDate) {
        url += `&newPage=${page}&score=${lastScore}&id=${lastId}&displayDate=${encodeURIComponent(lastDisplayDate)}`
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

        let cHeader = getCookieHeader()
        if (cHeader) {
          headers['Cookie'] = cHeader
        }

        const metadadosParams = {
          q,
          qUrl,
          searchType,
          s: sParam,
          publishFrom: fromDDMMYYYY,
          publishTo: toDDMMYYYY,
          orgPrin,
          processNumber,
          oabNumber,
          cpfCnpj,
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

        const setCookieHeaders = res.headers['Set-Cookie'] || res.headers['set-cookie'] || []
        if (setCookieHeaders && setCookieHeaders.length > 0) {
          for (let c of setCookieHeaders) {
            cookies.push(c.split(';')[0])
          }
        }

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
                let pagePassedCount = 0

                for (const item of parsed.jsonArray) {
                  if (item.urlTitle && uniqueUrls.has(item.urlTitle)) {
                    discardedCount++
                    discardReasons['Duplicado'] = (discardReasons['Duplicado'] || 0) + 1
                    continue
                  }
                  if (item.urlTitle) uniqueUrls.add(item.urlTitle)

                  let cleanText = (item.content || '').replace(/<[^>]*>?/gm, '').trim()
                  let cleanTitle = (item.title || item.artType || '')
                    .replace(/<[^>]*>?/gm, '')
                    .trim()

                  let pubDateStr = item.pubDate || fromDDMMYYYY
                  let pubYYYYMMDD = parseDateToYYYYMMDD(pubDateStr)

                  const urlTitle = item.urlTitle
                    ? `https://www.in.gov.br/web/dou/-/${item.urlTitle}`
                    : ''

                  let org_principal = ''
                  let org_subordinada = ''
                  if (item.hierarchyStr) {
                    const parts = item.hierarchyStr.split('-').map((p) => p.trim())
                    if (parts.length > 0) org_principal = parts[0]
                    if (parts.length > 1) org_subordinada = parts.slice(1).join(' - ')
                  }

                  let fullText =
                    `${cleanTitle} ${cleanText} ${item.hierarchyStr || ''}`.toLowerCase()
                  let pass = true
                  let discardReason = ''

                  if (pubYYYYMMDD < publishFrom || pubYYYYMMDD > publishTo) {
                    pass = false
                    discardReason = 'Fora do período'
                  }

                  if (pass) {
                    if (searchType === 'frase_exata') {
                      const exact = q.toLowerCase().trim()
                      pass = fullText.includes(exact)
                      if (!pass) discardReason = 'Frase exata não encontrada'
                    } else if (searchType === 'regex') {
                      try {
                        const regex = new RegExp(q, 'i')
                        pass = regex.test(fullText)
                        if (!pass) discardReason = 'Regex principal não encontrado'
                      } catch (e) {
                        pass = false
                        discardReason = 'Regex principal inválido'
                      }
                    } else {
                      const tokens = q.toLowerCase().trim().split(/\s+/)
                      pass = tokens.every((t) => fullText.includes(t))
                      if (!pass) discardReason = 'Palavras-chave incompletas'
                    }
                  }

                  if (pass && processNumber) {
                    if (searchType === 'regex') {
                      try {
                        pass = new RegExp(processNumber, 'i').test(fullText)
                      } catch (e) {}
                    } else {
                      const cleanFullText = fullText.replace(/[\.\-\/]/g, '')
                      const cleanProcess = processNumber.replace(/[\.\-\/]/g, '').toLowerCase()
                      pass =
                        cleanFullText.includes(cleanProcess) ||
                        fullText.includes(processNumber.toLowerCase())
                    }
                    if (!pass && !discardReason) discardReason = 'Número do processo não encontrado'
                  }

                  if (pass && oabNumber) {
                    if (searchType === 'regex') {
                      try {
                        pass = new RegExp(oabNumber, 'i').test(fullText)
                      } catch (e) {}
                    } else {
                      const cleanFullText = fullText.replace(/[\.\-\/]/g, '')
                      const cleanOab = oabNumber.replace(/[\.\-\/]/g, '').toLowerCase()
                      pass =
                        cleanFullText.includes(cleanOab) ||
                        fullText.includes(oabNumber.toLowerCase())
                    }
                    if (!pass && !discardReason) discardReason = 'Número da OAB não encontrado'
                  }

                  if (pass && cpfCnpj) {
                    if (searchType === 'regex') {
                      try {
                        pass = new RegExp(cpfCnpj, 'i').test(fullText)
                      } catch (e) {}
                    } else {
                      const cleanFullText = fullText.replace(/[\.\-\/]/g, '')
                      const cleanCpf = cpfCnpj.replace(/[\.\-\/]/g, '').toLowerCase()
                      pass =
                        cleanFullText.includes(cleanCpf) || fullText.includes(cpfCnpj.toLowerCase())
                    }
                    if (!pass && !discardReason) discardReason = 'CPF/CNPJ não encontrado'
                  }

                  if (pass && fonteColeta) {
                    if (searchType === 'regex') {
                      try {
                        pass = new RegExp(fonteColeta, 'i').test(item.pubName || '')
                      } catch (e) {}
                    } else {
                      pass = (item.pubName || '').toLowerCase().includes(fonteColeta.toLowerCase())
                    }
                    if (!pass && !discardReason) discardReason = 'Fonte de coleta não compatível'
                  }

                  if (!pass) {
                    discardedCount++
                    if (discardReason) {
                      discardReasons[discardReason] = (discardReasons[discardReason] || 0) + 1
                    }
                    continue
                  }

                  let normalizedArtType = item.artType || 'Publicação'

                  results.push({
                    title: cleanTitle,
                    content: cleanText,
                    pubName: item.pubName || 'DOU',
                    artType: normalizedArtType,
                    urlTitle: urlTitle,
                    pubDate: pubYYYYMMDD + 'T00:00:00.000Z',
                    editionNumber: String(item.editionNumber || ''),
                    numberPage: String(item.numberPage || ''),
                    hierarchyStr: item.hierarchyStr || '',
                    orgao_principal: org_principal,
                    organizacao_subordinada: org_subordinada,
                    source: 'DOU_SCRAPING',
                  })

                  pagePassedCount++
                }

                if (pagePassedCount === 0) {
                  consecutivePagesZeroPassed++
                  if (consecutivePagesZeroPassed >= 5) {
                    hasMore = false
                    logProcess(
                      'parsing',
                      'Aviso',
                      `Parando paginação: 5 páginas consecutivas sem itens válidos. (Página ${page})`,
                    )
                  }
                } else {
                  consecutivePagesZeroPassed = 0
                }

                lastScore = parsed.jsonArray[parsed.jsonArray.length - 1].score || ''
                lastId = newLastId
                lastDisplayDate =
                  parsed.jsonArray[parsed.jsonArray.length - 1].displayDate ||
                  parsed.jsonArray[parsed.jsonArray.length - 1].pubDate ||
                  ''

                if (parsed.jsonArray.length < 20) hasMore = false

                logProcess(
                  'parsing',
                  'Sucesso',
                  `Extraídos ${parsed.jsonArray.length} itens da página ${page}. Aprovados localmente: ${pagePassedCount}`,
                  {
                    quantidade_itens: parsed.jsonArray.length,
                    mantidos: pagePassedCount,
                    lastDisplayDate: lastDisplayDate,
                    datas_avaliadas: parsed.jsonArray.map((item) => {
                      const dStr = item.pubDate || fromDDMMYYYY
                      const ymd = parseDateToYYYYMMDD(dStr)
                      const inRange = ymd >= publishFrom && ymd <= publishTo
                      return { raw_date: dStr, parsed_date: ymd, in_range: inRange }
                    }),
                  },
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
          scrapeError = `bloqueio funcional por origem (HTTP ${res.statusCode})`
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

    if (scrapeSuccess || results.length > 0) {
      logProcess(
        'normalization',
        'Sucesso',
        `Busca concluída. Mantidos: ${results.length}. Descartados: ${discardedCount}.`,
        {
          query_key: `${q}_${publishFrom}_${publishTo}`,
          timeframe: `${publishFrom} to ${publishTo}`,
          quantidade_itens: results.length,
          descartados: discardedCount,
          descartados_fora_periodo: discardReasons['Fora do período'] || 0,
          searchType: searchType,
          motivos_descarte: discardReasons,
          lastDisplayDate: lastDisplayDate,
          total_pages_processed: page - 1,
        },
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
