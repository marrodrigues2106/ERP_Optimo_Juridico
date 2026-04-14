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
    let searchType = body.searchType || 'palavra-chave'

    if (!q) {
      return e.badRequestError('O termo de busca (q) é obrigatório.')
    }

    const logsCol = $app.findCollectionByNameOrId('logs_processamento')

    const logProcess = (etapa, status, msg, source = '') => {
      try {
        const logRec = new Record(logsCol)
        logRec.set('etapa', etapa)
        logRec.set('status', status)
        logRec.set('mensagem', source ? `${msg} | Source: ${source}` : msg)
        logRec.set('data_hora', new Date().toISOString())
        $app.save(logRec)
      } catch (err) {
        console.error('Log error in dou_search:', err)
      }
    }

    let today = new Date().toISOString().split('T')[0]
    let fromDate = publishFrom || today
    let toDate = publishTo || today
    let fromDDMMYYYY = fromDate.split('-').reverse().join('/')
    let toDDMMYYYY = toDate.split('-').reverse().join('/')

    logProcess(
      '[Busca Ativa DOU - Início]',
      'Iniciada',
      `Buscando por: ${q} | Tipo: ${searchType} | Período: ${fromDate} a ${toDate} | Params: ${JSON.stringify(body)}`,
      'DOU_SCRAPING',
    )

    let page = 1
    let hasMore = true
    let lastScore = ''
    let lastId = ''
    let lastDisplayDate = ''
    let scrapeResults = []
    let scrapeSuccess = false
    let scrapeError = ''

    let totalExtracted = 0
    let totalTextFiltered = 0
    let totalDateFiltered = 0

    // Conjunto para evitar itens duplicados na própria varredura
    const seenUrls = {}

    const normalizar_texto = (text) => {
      if (!text) return ''
      return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[.,:;!?(){}\[\]"'-]/g, ' ')
        .replace(/\n|\r/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    const extrair_tokens = (text) => {
      const stopwords = ['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o']
      return normalizar_texto(text)
        .split(' ')
        .filter((t) => t.length >= 3 && !stopwords.includes(t))
    }

    const qNorm = normalizar_texto(q)
    const qTokens = extrair_tokens(q)

    const parseDouDate = (pubDateStr) => {
      if (!pubDateStr) return ''
      const datePart = pubDateStr.split(' ')[0]
      if (datePart.includes('/')) {
        const parts = datePart.split('/')
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
      }
      return datePart
    }

    const calcular_peso_por_campo = (item, typeStr) => {
      let score = 0

      const titleNorm = normalizar_texto(item.title || '')
      const contentNorm = normalizar_texto(item.content || '')
      const pubNameNorm = normalizar_texto(item.pubName || '')
      const hierarchyStrNorm = normalizar_texto(item.hierarchyStr || '')
      const fullText = `${titleNorm} ${contentNorm} ${pubNameNorm} ${hierarchyStrNorm}`

      if (typeStr === 'regex') {
        try {
          const regex = new RegExp(q, 'i')
          if (
            regex.test(item.title || '') ||
            regex.test(item.content || '') ||
            regex.test(item.hierarchyStr || '')
          ) {
            return 100
          }
          return 0
        } catch (e) {
          return 0
        }
      }

      if (typeStr === 'frase') {
        if (fullText.includes(qNorm)) return 100
        return 0
      }

      // Keyword logic
      let matchedTokens = 0
      for (let token of qTokens) {
        if (fullText.includes(token)) matchedTokens++
      }

      let passesKeywordRule = false
      if (qTokens.length === 1) {
        if (matchedTokens === 1) passesKeywordRule = true
      } else if (qTokens.length === 2) {
        if (matchedTokens >= 1) passesKeywordRule = true
      } else if (qTokens.length >= 3) {
        if (matchedTokens / qTokens.length >= 0.6) passesKeywordRule = true
      }

      if (!passesKeywordRule) return 0

      // Full Expression Match
      if (qNorm && titleNorm.includes(qNorm)) score += 40
      if (qNorm && hierarchyStrNorm.includes(qNorm)) score += 35
      if (qNorm && contentNorm.includes(qNorm)) score += 20
      if (qNorm && pubNameNorm.includes(qNorm)) score += 15

      // Individual Token Match
      for (let token of qTokens) {
        if (titleNorm.includes(token)) score += 12
        if (hierarchyStrNorm.includes(token)) score += 10
        if (contentNorm.includes(token)) score += 6
        if (pubNameNorm.includes(token)) score += 4
      }

      // Institutional
      if (
        fullText.includes('tribunal') &&
        fullText.includes('contas') &&
        fullText.includes('uniao')
      ) {
        score += 10
      }

      // Proper Names/Density
      let titleHierarchyMatches = 0
      for (let token of qTokens) {
        if (titleNorm.includes(token) || hierarchyStrNorm.includes(token)) {
          titleHierarchyMatches++
        }
      }
      if (titleHierarchyMatches >= 2) {
        score += 8
      }

      return score
    }

    while (page <= 5 && hasMore) {
      let url = `https://www.in.gov.br/consulta/-/buscar/dou?q=${encodeURIComponent(q)}&s=do1,do2,do3,doextra&exactDate=personalizado&publishFrom=${fromDDMMYYYY}&publishTo=${toDDMMYYYY}&sortType=0&delta=20&currentPage=${page}`

      if (orgPrin) {
        url += `&orgPrin=${encodeURIComponent(orgPrin)}`
      }

      if (page > 1 && lastScore && lastId && lastDisplayDate) {
        url += `&newPage=${page}&score=${lastScore}&id=${lastId}&displayDate=${lastDisplayDate}`
      }

      try {
        logProcess(
          '[Busca Ativa DOU - Scraping]',
          'Processando',
          `Buscando página ${page}... URL: ${url}`,
          'DOU_SCRAPING',
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
                let pageExtracted = 0
                let pageTextFiltered = 0
                let pageDateFiltered = 0

                for (let item of parsed.jsonArray) {
                  pageExtracted++

                  const itemPubDate = item.pubDate || ''
                  const itemDateISO = parseDouDate(itemPubDate)

                  if (!itemDateISO || itemDateISO < fromDate || itemDateISO > toDate) {
                    pageDateFiltered++
                    logProcess(
                      '[Busca Ativa DOU - Rejeitado]',
                      'Aviso',
                      `Rejeitado por Data (Fora do período): ${item.title || item.artType}`,
                      'DOU_SCRAPING',
                    )
                    continue
                  }

                  const score = calcular_peso_por_campo(item, searchType)
                  if (score < 30) {
                    pageTextFiltered++
                    logProcess(
                      '[Busca Ativa DOU - Rejeitado]',
                      'Aviso',
                      `Rejeitado por Score (<30): ${item.title || item.artType}`,
                      'DOU_SCRAPING',
                    )
                    continue
                  }

                  item.calculatedScore = score

                  if (item.urlTitle && !seenUrls[item.urlTitle]) {
                    seenUrls[item.urlTitle] = true
                    scrapeResults.push(item)
                  } else if (!item.urlTitle) {
                    scrapeResults.push(item)
                  }
                }

                totalExtracted += pageExtracted
                totalTextFiltered += pageTextFiltered
                totalDateFiltered += pageDateFiltered

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
            scrapeError =
              'Structure Mismatch: Script tag _br_com_seatecnologia_in_buscadou_BuscaDouPortlet_params not found'
            logProcess(
              '[Busca Ativa DOU - Parse]',
              'Erro',
              `Página ${page}: Script não encontrado no HTML retornado.`,
              'DOU_SCRAPING',
            )
          }
        } else {
          hasMore = false
          scrapeError = `HTTP ${res.statusCode}: Erro de acesso/servidor.`
          logProcess('[Busca Ativa DOU - Erro Scraping]', 'Erro', scrapeError, 'DOU_SCRAPING')
        }
      } catch (err) {
        logProcess('[Busca Ativa DOU - Erro Scraping]', 'Erro', String(err), 'DOU_SCRAPING')
        hasMore = false
        scrapeError = String(err)
      }
      page++
    }

    let results = []

    if (scrapeSuccess && scrapeResults.length > 0) {
      results = scrapeResults.map((item) => {
        let cleanText = (item.content || '').replace(/<[^>]*>?/gm, '').trim()
        let cleanTitle = (item.title || item.artType || '').replace(/<[^>]*>?/gm, '').trim()

        let pubDateStr = item.pubDate || ''
        if (pubDateStr.includes('/')) {
          const parts = pubDateStr.split(' ')[0].split('/')
          if (parts.length === 3) pubDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`
        }
        if (!pubDateStr.includes(':') && pubDateStr) pubDateStr += ' 00:00:00'

        const urlTitle = item.urlTitle ? `https://www.in.gov.br/web/dou/-/${item.urlTitle}` : ''

        let org_principal = ''
        let org_subordinada = ''
        if (item.hierarchyStr) {
          const parts = item.hierarchyStr.split('-').map((p) => p.trim())
          if (parts.length > 0) org_principal = parts[0]
          if (parts.length > 1) org_subordinada = parts.slice(1).join(' - ')
        }

        return {
          title: cleanTitle,
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
          score: item.calculatedScore,
        }
      })

      if (artType) {
        const lowerArtType = artType.toLowerCase()
        results = results.filter((r) => r.artType && r.artType.toLowerCase().includes(lowerArtType))
      }

      results.sort((a, b) => {
        const dateA = a.pubDate || ''
        const dateB = b.pubDate || ''
        return dateB.localeCompare(dateA)
      })
    }

    logProcess(
      '[Busca Ativa DOU - Resumo Final]',
      'Concluída',
      `total_extraidos: ${totalExtracted} | descartados_texto: ${totalTextFiltered} | descartados_data: ${totalDateFiltered} | mantidos: ${results.length}`,
      'DOU_SCRAPING',
    )

    let finalMessage = 'Sucesso'
    if (results.length === 0) {
      finalMessage = scrapeError
        ? scrapeError
        : 'Nenhum resultado válido encontrado após a aplicação dos filtros locais de texto e data.'
    }

    return e.json(200, {
      success: true,
      source: 'DOU_SCRAPING',
      total: results.length,
      data: results,
      message: finalMessage,
    })
  },
  $apis.requireAuth(),
)
