routerAdd(
  'POST',
  '/backend/v1/dou/search',
  (e) => {
    // Security & Permissions
    if (
      !e.auth ||
      (!e.auth.getBool('can_view_search_module') && e.auth.getString('role') !== 'admin')
    ) {
      return e.forbiddenError(
        'Acesso Negado: Você não tem permissão para acessar o módulo de busca.',
      )
    }

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
        } catch (err) {}
      }
      try {
        const dateObj = new Date(dStr)
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString().split('T')[0]
        }
      } catch (err) {}
      return dStr
    }

    const splitDateRange = (startStr, endStr, maxDays) => {
      const chunks = []
      let current = new Date(startStr + 'T12:00:00Z')
      const end = new Date(endStr + 'T12:00:00Z')

      if (isNaN(current.getTime()) || isNaN(end.getTime()) || current > end) {
        return [{ start: startStr, end: endStr }]
      }

      while (current <= end) {
        let chunkStart = new Date(current)
        let chunkEnd = new Date(current)
        chunkEnd.setDate(chunkEnd.getDate() + (maxDays - 1))

        if (chunkEnd > end) {
          chunkEnd = new Date(end)
        }

        chunks.push({
          start: chunkStart.toISOString().split('T')[0],
          end: chunkEnd.toISOString().split('T')[0],
        })

        current = new Date(chunkEnd)
        current.setDate(current.getDate() + 1)
      }
      return chunks
    }

    const normalizeText = (str) => {
      if (!str) return ''
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    const body = e.requestInfo().body || {}
    const q = body.q || ''
    const searchType = body.searchType || 'palavras_chave'
    let publishFrom = body.publishFrom || ''
    let publishTo = body.publishTo || ''
    let orgPrin = body.orgPrin || ''
    let numeroProcesso = body.numeroProcesso || ''
    let numeroOab = body.numeroOab || ''
    let cpfCnpj = body.cpfCnpj || ''
    let secaoDou = body.secaoDou || ''
    let fonteColeta = body.fonteColeta || ''
    let artType = body.artType || ''

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

    const dateChunks = splitDateRange(publishFrom, publishTo, 10)

    let scrapeSuccess = false
    let scrapeError = ''
    let results = []
    let discardedCount = 0
    let totalPagesProcessed = 0

    let discardReasons = {
      fora_do_periodo: 0,
      nao_corresponde_frase: 0,
      nao_corresponde_regex: 0,
      nao_corresponde_termo_livre: 0,
      duplicado: 0,
      ja_no_banco: 0,
      tipo_ato_incompativel: 0,
      ausencia_campo_obrigatorio: 0,
    }
    const uniqueUrls = new Set()

    let qTerm = q.trim().replace(/\s+/g, ' ')
    let qUrl = ''

    // 1. Build Query
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
    if (secaoDou && secaoDou !== 'all') {
      sParam = secaoDou
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

            let delay = attempt * 2000
            if (res.statusCode === 403 || res.statusCode === 429) {
              delay = attempt * 5000
              logProcess(
                'request',
                'Aviso',
                `HTTP ${res.statusCode} detectado - aplicando backoff delay de ${delay}ms (Tentativa ${attempt}/${maxRetries})`,
                { url_consultada: url, status_http: res.statusCode, attempt },
              )
            } else {
              logProcess(
                'request',
                'Aviso',
                `HTTP ${res.statusCode} detectado - aplicando delay de ${delay}ms (Tentativa ${attempt}/${maxRetries})`,
                { url_consultada: url, status_http: res.statusCode, attempt },
              )
            }

            let start = new Date().getTime()
            while (new Date().getTime() - start < delay) {}
            continue
          }
          return res
        } catch (err) {
          attempt++
          if (attempt >= maxRetries) {
            throw err
          }
          let delay = attempt * 2000
          logProcess(
            'request',
            'Aviso',
            `Erro de conexão detectado - aplicando delay de ${delay}ms (Tentativa ${attempt}/${maxRetries})`,
            { url_consultada: url, erro: String(err), attempt },
          )
          let start = new Date().getTime()
          while (new Date().getTime() - start < delay) {}
        }
      }
    }

    let cookies = []
    const getCookieHeader = () => cookies.join('; ')

    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.3; rv:123.0) Gecko/20100101 Firefox/123.0',
    ]
    let userAgentIndex = 0

    // 2. Loop over partitioned date chunks
    for (const chunk of dateChunks) {
      let fromDDMMYYYY = chunk.start.split('-').reverse().join('/')
      let toDDMMYYYY = chunk.end.split('-').reverse().join('/')

      logProcess(
        'partitioning',
        'Processando',
        `Iniciando bloco temporal: ${fromDDMMYYYY} - ${toDDMMYYYY}`,
        {
          start: chunk.start,
          end: chunk.end,
        },
      )

      let page = 1
      let hasMore = true
      let lastScore = ''
      let lastId = ''
      let lastDisplayDate = ''
      const maxPages = 50

      let consecutivePagesZeroPassed = 0
      let loopAttempts = 0
      let useCursor = true
      let delta = 20

      while (page <= maxPages && hasMore) {
        let url = `https://www.in.gov.br/consulta/-/buscar/dou?q=${qUrl}&s=${sParam}&exactDate=personalizado&publishFrom=${fromDDMMYYYY}&publishTo=${toDDMMYYYY}&sortType=0&delta=${delta}&currentPage=${page}`
        if (orgPrin) {
          url += `&orgPrin=${encodeURIComponent(orgPrin)}`
        }

        if (page > 1 && useCursor && lastScore && lastId && lastDisplayDate) {
          url += `&newPage=${page}&score=${lastScore}&id=${lastId}&displayDate=${encodeURIComponent(lastDisplayDate)}`
        }

        try {
          const randomUA = userAgents[userAgentIndex % userAgents.length]

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
            publishFrom: chunk.start,
            publishTo: chunk.end,
            orgPrin,
            numeroProcesso,
            numeroOab,
            cpfCnpj,
            lastId: lastId || undefined,
            lastScore: lastScore || undefined,
            lastDisplayDate: lastDisplayDate || undefined,
            pageNumber: page,
            newPage: page > 1 ? page : undefined,
            score: lastScore || undefined,
            id: lastId || undefined,
            displayDate: lastDisplayDate || undefined,
          }

          logProcess(
            'request',
            'Processando',
            `Requisitando página ${page} do bloco ${fromDDMMYYYY}-${toDDMMYYYY}`,
            {
              url_consultada: url,
              params_enviados: metadadosParams,
              pagina_atual: page,
            },
          )

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
              } catch (err) {
                html = latin1
              }
            }

            // 3. Parse
            logProcess('parsing', 'Processando', `Procurando portlet na resposta da página ${page}`)

            const scriptMatch = html.match(
              /<script[^>]*id="_br_com_seatecnologia_in_buscadou_BuscaDouPortlet_params"[^>]*>([\s\S]*?)<\/script>/,
            )

            if (scriptMatch && scriptMatch[1]) {
              const parsed = JSON.parse(scriptMatch[1].trim())
              if (parsed.jsonArray && parsed.jsonArray.length > 0) {
                const newLastId = parsed.jsonArray[parsed.jsonArray.length - 1].id || ''

                // LOOP DETECTION
                let isLoop = false
                if (newLastId === lastId && lastId !== '') {
                  isLoop = true
                }

                let sessionNewItems = 0
                for (const item of parsed.jsonArray) {
                  let uk = item.urlTitle || item.id || item.title + item.pubDate
                  if (!uniqueUrls.has(uk)) {
                    sessionNewItems++
                  }
                }

                if (sessionNewItems === 0 && parsed.jsonArray.length > 0) {
                  isLoop = true
                }

                if (isLoop) {
                  loopAttempts++
                  let strategyMsg = ''

                  if (loopAttempts === 1) {
                    strategyMsg = 'Iniciando Salto Temporal Forçado (Ajuste de cursor)'
                    if (lastDisplayDate) {
                      try {
                        let d = new Date(lastDisplayDate)
                        if (!isNaN(d.getTime())) {
                          d.setSeconds(d.getSeconds() - 1)
                          lastDisplayDate = d.toISOString().replace('Z', '000Z')
                        } else {
                          lastScore = String(parseFloat(lastScore || '1') - 0.001)
                        }
                      } catch (e) {
                        lastScore = String(parseFloat(lastScore || '1') - 0.001)
                      }
                    } else {
                      lastScore = String(parseFloat(lastScore || '1') - 0.001)
                    }
                    useCursor = true
                  } else if (loopAttempts === 2) {
                    strategyMsg = 'Alterando tamanho da página para 21 (Cache Breaking)'
                    delta = 21
                    useCursor = true
                  } else if (loopAttempts === 3) {
                    strategyMsg = 'Rotacionando User-Agent e limpando cookies (Session Reset)'
                    userAgentIndex++
                    cookies = []
                    delta = 25
                    useCursor = false
                  }

                  logProcess(
                    'parsing',
                    'Aviso',
                    `Erro de Loop de Paginação detectado no DOU. Tentativa de recuperação ${loopAttempts}/3. ${strategyMsg}`,
                    {
                      pageNumber: page,
                      lastId: lastId,
                      lastScore: lastScore,
                      quantidade_itens: parsed.jsonArray.length,
                      estrategia: strategyMsg,
                    },
                  )

                  if (loopAttempts > 3) {
                    hasMore = false
                    logProcess(
                      'parsing',
                      'Falha',
                      `Falha ao recuperar de loop após 3 tentativas. Parando paginação para o bloco atual.`,
                    )
                  } else {
                    if (loopAttempts === 3) {
                      page++
                    }
                    continue
                  }
                } else {
                  loopAttempts = 0
                  useCursor = true
                  delta = 20
                }

                let pagePassedCount = 0
                let pageUniqueCount = 0

                // 4. Normalization
                for (const item of parsed.jsonArray) {
                  // 8. Deduplication (Session)
                  let uniqueKey = item.urlTitle || item.id || item.title + item.pubDate
                  if (uniqueUrls.has(uniqueKey)) {
                    discardedCount++
                    discardReasons['duplicado']++
                    logProcess(
                      'normalization',
                      'Aviso',
                      `Descartado: duplicado na sessão (Url/Id: ${uniqueKey})`,
                      {
                        url: uniqueKey,
                        motivo: 'duplicado',
                      },
                    )
                    continue
                  }
                  uniqueUrls.add(uniqueKey)
                  pageUniqueCount++

                  let cleanText = (item.content || '').replace(/<[^>]*>?/gm, '').trim()
                  let cleanTitle = (item.title || item.artType || '')
                    .replace(/<[^>]*>?/gm, '')
                    .trim()

                  // Deduplication (Database via Hash)
                  const hash_conteudo = $security.md5(
                    cleanTitle + cleanText + (item.urlTitle || ''),
                  )

                  let inDb = false
                  try {
                    $app.findFirstRecordByData('publicacoes_dou', 'hash_conteudo', hash_conteudo)
                    inDb = true
                  } catch (_) {}

                  if (!inDb) {
                    try {
                      $app.findFirstRecordByData(
                        'gazette_publications',
                        'hash_conteudo',
                        hash_conteudo,
                      )
                      inDb = true
                    } catch (_) {}
                  }

                  if (inDb) {
                    discardedCount++
                    discardReasons['ja_no_banco']++
                    logProcess(
                      'normalization',
                      'Aviso',
                      `Descartado: já existente no banco (Hash: ${hash_conteudo})`,
                      { hash: hash_conteudo, motivo: 'ja_no_banco' },
                    )
                    continue
                  }

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

                  let rawFullText = `${cleanTitle} ${cleanText} ${item.hierarchyStr || ''}`
                  let fullTextNormalized = normalizeText(rawFullText)
                  let pass = true
                  let discardReason = ''
                  let discardSnippet = ''

                  // 5. Temporal Filter
                  if (pubYYYYMMDD && pubYYYYMMDD.length === 10 && pubYYYYMMDD.includes('-')) {
                    if (pubYYYYMMDD < publishFrom || pubYYYYMMDD > publishTo) {
                      pass = false
                      discardReason = `fora_do_periodo: data ${pubYYYYMMDD} fora de ${publishFrom} a ${publishTo}`
                    }
                  } else {
                    logProcess(
                      'normalization',
                      'Aviso',
                      `Data com formatação inconsistente (${pubDateStr}), assumindo no período por segurança.`,
                    )
                  }

                  // 7. SearchType Filter (Strict)
                  if (pass) {
                    if (searchType === 'frase_exata') {
                      let exact = q.trim()
                      if (
                        (exact.startsWith('"') && exact.endsWith('"')) ||
                        (exact.startsWith("'") && exact.endsWith("'"))
                      ) {
                        exact = exact.substring(1, exact.length - 1).trim()
                      }

                      let exactNormalized = normalizeText(exact)
                      let matchedRaw = rawFullText.toLowerCase().includes(exact.toLowerCase())

                      pass = fullTextNormalized.includes(exactNormalized)

                      if (pass && !matchedRaw) {
                        logProcess(
                          'normalization',
                          'Info',
                          `Almost matched: O termo foi encontrado apenas após normalização (remoção de acentos/espaços).`,
                          {
                            url: urlTitle || item.title,
                            termo_buscado: exact,
                            termo_normalizado: exactNormalized,
                          },
                        )
                      }

                      if (!pass) {
                        discardReason = `nao_corresponde_frase: não contém '${exactNormalized}'`
                        discardSnippet = cleanText.substring(0, 150).replace(/\s+/g, ' ') + '...'
                      }
                    } else if (searchType === 'regex') {
                      try {
                        const regex = new RegExp(q, 'i')
                        pass = regex.test(rawFullText)
                        if (!pass) discardReason = `nao_corresponde_regex: regex falhou`
                      } catch (err) {
                        pass = false
                        discardReason = `nao_corresponde_regex: regex inválido`
                      }
                    } else {
                      const tokens = normalizeText(q).split(/\s+/)
                      const matchCount = tokens.filter((t) => fullTextNormalized.includes(t)).length
                      pass = matchCount / tokens.length >= 0.5 // 50% of words is enough
                      if (!pass) {
                        discardReason = `nao_corresponde_termo_livre: faltam termos essenciais`
                        discardSnippet = cleanText.substring(0, 150).replace(/\s+/g, ' ') + '...'
                      }
                    }
                  }

                  // 6. Structured Field Filter
                  if (pass && numeroProcesso) {
                    if (searchType === 'regex') {
                      try {
                        pass = new RegExp(numeroProcesso, 'i').test(rawFullText)
                      } catch (err) {}
                    } else if (searchType === 'frase_exata') {
                      pass = fullTextNormalized.includes(normalizeText(numeroProcesso))
                    } else {
                      const cleanFullText = fullTextNormalized
                        .replace(/[\.\-\/\s]/g, '')
                        .replace(/^0+/, '')
                      const cleanProcess = numeroProcesso
                        .replace(/[\.\-\/\s]/g, '')
                        .replace(/^0+/, '')
                        .toLowerCase()
                      pass =
                        cleanFullText.includes(cleanProcess) ||
                        fullTextNormalized.includes(numeroProcesso.toLowerCase())
                    }
                    if (!pass && !discardReason)
                      discardReason = `ausencia_campo_obrigatorio: processo '${numeroProcesso}' não corresponde`
                  }

                  if (pass && numeroOab) {
                    if (searchType === 'regex') {
                      try {
                        pass = new RegExp(numeroOab, 'i').test(rawFullText)
                      } catch (err) {}
                    } else if (searchType === 'frase_exata') {
                      pass = fullTextNormalized.includes(normalizeText(numeroOab))
                    } else {
                      const cleanFullText = fullTextNormalized
                        .replace(/[\.\-\/\s]/g, '')
                        .replace(/^0+/, '')
                      const cleanOab = numeroOab
                        .replace(/[\.\-\/\s]/g, '')
                        .replace(/^0+/, '')
                        .toLowerCase()
                      pass =
                        cleanFullText.includes(cleanOab) ||
                        fullTextNormalized.includes(numeroOab.toLowerCase())
                    }
                    if (!pass && !discardReason)
                      discardReason = `ausencia_campo_obrigatorio: OAB '${numeroOab}' não corresponde`
                  }

                  if (pass && cpfCnpj) {
                    if (searchType === 'regex') {
                      try {
                        pass = new RegExp(cpfCnpj, 'i').test(rawFullText)
                      } catch (err) {}
                    } else if (searchType === 'frase_exata') {
                      pass = fullTextNormalized.includes(normalizeText(cpfCnpj))
                    } else {
                      const cleanFullText = fullTextNormalized
                        .replace(/[\.\-\/\s]/g, '')
                        .replace(/^0+/, '')
                      const cleanCpf = cpfCnpj
                        .replace(/[\.\-\/\s]/g, '')
                        .replace(/^0+/, '')
                        .toLowerCase()
                      pass =
                        cleanFullText.includes(cleanCpf) ||
                        fullTextNormalized.includes(cpfCnpj.toLowerCase())
                    }
                    if (!pass && !discardReason)
                      discardReason = `ausencia_campo_obrigatorio: CPF/CNPJ '${cpfCnpj}' não corresponde`
                  }

                  if (pass && artType) {
                    const itemArtType = normalizeText(item.artType || '')
                    const filterArtType = normalizeText(artType)
                    if (!itemArtType.includes(filterArtType)) {
                      pass = false
                      if (!discardReason)
                        discardReason = `tipo_ato_incompativel: '${item.artType}' != '${artType}'`
                    }
                  }

                  if (pass && fonteColeta) {
                    if (searchType === 'regex') {
                      try {
                        pass = new RegExp(fonteColeta, 'i').test(item.pubName || '')
                      } catch (err) {}
                    } else {
                      pass = normalizeText(item.pubName || '').includes(normalizeText(fonteColeta))
                    }
                    if (!pass && !discardReason)
                      discardReason = `ausencia_campo_obrigatorio: fonte '${fonteColeta}' não corresponde`
                  }

                  if (!pass) {
                    discardedCount++
                    const simpleReason = discardReason ? discardReason.split(':')[0] : 'descartado'
                    if (discardReasons[simpleReason] !== undefined) {
                      discardReasons[simpleReason]++
                    } else {
                      discardReasons[simpleReason] = 1
                    }

                    const metaLog = {
                      url: urlTitle,
                      title: cleanTitle,
                      motivo: discardReason,
                    }
                    if (discardSnippet) {
                      metaLog.snippet = discardSnippet
                    }

                    logProcess(
                      'normalization',
                      'Aviso',
                      `Descartado: ${discardReason} (Url: ${urlTitle || item.title || 'Desconhecido'})`,
                      metaLog,
                    )
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
                    hash_conteudo: hash_conteudo,
                  })

                  pagePassedCount++
                }

                if (pagePassedCount === 0 && pageUniqueCount > 0) {
                  consecutivePagesZeroPassed++
                  if (consecutivePagesZeroPassed >= 10) {
                    hasMore = false
                    logProcess(
                      'parsing',
                      'Aviso',
                      `Parando paginação: 10 páginas consecutivas sem itens válidos. (Página ${page})`,
                    )
                  }
                } else if (pagePassedCount > 0) {
                  consecutivePagesZeroPassed = 0
                }

                lastScore = parsed.jsonArray[parsed.jsonArray.length - 1].score || ''
                lastId = newLastId
                lastDisplayDate =
                  parsed.jsonArray[parsed.jsonArray.length - 1].displayDate ||
                  parsed.jsonArray[parsed.jsonArray.length - 1].pubDate ||
                  ''

                if (parsed.jsonArray.length < delta) hasMore = false

                logProcess(
                  'parsing',
                  'Sucesso',
                  `Extraídos ${parsed.jsonArray.length} itens da página ${page} do bloco ${fromDDMMYYYY}-${toDDMMYYYY}. Aprovados localmente: ${pagePassedCount}`,
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
                scrapeSuccess = true
              } else {
                hasMore = false
                scrapeSuccess = true
                logProcess(
                  'parsing',
                  'Sucesso',
                  `Nenhum item retornado na página ${page} do bloco ${fromDDMMYYYY}-${toDDMMYYYY} (jsonArray vazio)`,
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
          logProcess(
            'request',
            'Falha',
            'Erro de conexão/timeout no bloco ' +
              fromDDMMYYYY +
              '-' +
              toDDMMYYYY +
              ': ' +
              scrapeError,
          )
        }

        page++
        totalPagesProcessed++

        if (hasMore) {
          let start = new Date().getTime()
          while (new Date().getTime() - start < 2000) {}
        }
      }

      if (dateChunks.length > 1 && chunk !== dateChunks[dateChunks.length - 1]) {
        logProcess('partitioning', 'Info', `Aplicando pausa (backoff) entre blocos temporais...`)
        let start = new Date().getTime()
        while (new Date().getTime() - start < 3000) {}
      }
    } // End of date chunk loop

    if (scrapeSuccess || results.length > 0) {
      logProcess(
        'normalization',
        'Sucesso',
        `Busca concluída. Mantidos: ${results.length}. Descartados: ${discardedCount}. Blocos executados: ${dateChunks.length}`,
        {
          query_key: `${q}_${publishFrom}_${publishTo}`,
          timeframe: `${publishFrom} to ${publishTo}`,
          quantidade_itens: results.length,
          descartados: discardedCount,
          searchType: searchType,
          motivos_descarte: discardReasons,
          total_pages_processed: totalPagesProcessed,
          chunks_count: dateChunks.length,
        },
      )
    }

    // 9. Final Response
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
