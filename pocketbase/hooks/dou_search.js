routerAdd(
  'POST',
  '/backend/v1/dou/search',
  (e) => {
    const body = e.requestInfo().body || {}
    const q = (body.q || '').trim()
    const publishFrom = body.publishFrom || ''
    const publishTo = body.publishTo || ''
    const searchType = body.searchType || 'palavras_chave'
    const orgPrin = body.orgPrin || ''

    const user = e.auth
    if (!user) return e.unauthorizedError('Não autorizado')
    const isAdmin = user.getString('role') === 'admin' || user.getBool('isAdmin')
    const canView = user.getBool('can_view_search_module')
    if (!isAdmin && !canView) {
      return e.forbiddenError('Sem permissão para acessar o módulo de busca.')
    }

    if (!q) {
      return e.badRequestError("Parâmetro 'q' é obrigatório.")
    }
    if (!publishFrom || !publishTo) {
      return e.badRequestError("Os parâmetros 'publishFrom' e 'publishTo' são obrigatórios.")
    }

    function logAction(mensagem, metadados, status = 'info', etapa = 'request') {
      try {
        const sysCol = $app.findCollectionByNameOrId('logs_processamento')
        const sysR = new Record(sysCol)
        sysR.set('etapa', etapa)
        sysR.set('status', status)
        sysR.set('mensagem', mensagem)
        sysR.set('data_hora', new Date().toISOString().replace('T', ' '))
        sysR.set('metadados', metadados)
        $app.saveNoValidate(sysR)
      } catch (err) {}
    }

    function sleep(ms) {
      const end = new Date().getTime() + ms
      while (new Date().getTime() < end) {}
    }

    function decodeISO(bytes) {
      let s = ''
      for (let i = 0; i < bytes.length; i++) {
        s += String.fromCharCode(bytes[i])
      }
      try {
        return decodeURIComponent(escape(s))
      } catch (err) {
        return s
      }
    }

    function stripNonNumeric(str) {
      if (!str) return ''
      return str.replace(/\D/g, '')
    }

    function cleanText(text) {
      if (!text) return ''
      let cleaned = text.replace(/<[^>]*>?/gm, ' ')
      cleaned = cleaned.replace(/\s+/g, ' ').trim()
      return cleaned
    }

    function mapArtType(artTypeRaw) {
      if (!artTypeRaw) return ''
      const map = {
        SOLUCAO_CONSULTA: 'Solução de Consulta',
        PORTARIA: 'Portaria',
        RESOLUCAO: 'Resolução',
        INSTRUCAO_NORMATIVA: 'Instrução Normativa',
        ATO_DECLARATORIO: 'Ato Declaratório',
        ATO_DECLARATORIO_EXECUTIVO: 'Ato Declaratório Executivo',
        DECISAO: 'Decisão',
        DECRETO: 'Decreto',
        LEI: 'Lei',
        MEDIDA_PROVISORIA: 'Medida Provisória',
        EMENDA_CONSTITUCIONAL: 'Emenda Constitucional',
        SULACO_DE_DIVERGENCIA: 'Solução de Divergência',
        ACORDAO: 'Acórdão',
        PARECER: 'Parecer',
        DESPACHO: 'Despacho',
        EXTRATO: 'Extrato',
        AVISO: 'Aviso',
        COMUNICADO: 'Comunicado',
        EDITAL: 'Edital',
        ATA: 'Ata',
        CONTRATO: 'Contrato',
        TERMO_ADITIVO: 'Termo Aditivo',
        LICITACAO: 'Licitação',
        HOMOLOGACAO: 'Homologação',
        RESULTADO: 'Resultado',
        RETIFICACAO: 'Retificação',
        ATO: 'Ato',
      }
      if (map[artTypeRaw]) return map[artTypeRaw]
      return artTypeRaw
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
    }

    function isMatch(rawText, term, type) {
      if (!rawText) return { match: false, reason: 'empty_content' }

      const normText = cleanText(rawText).toLowerCase()
      const normTerm = cleanText(term).toLowerCase()

      if (['numeroProcesso', 'numeroOab', 'cpfCnpj'].includes(type)) {
        const cleanTerm = stripNonNumeric(term)
        const cleanText = stripNonNumeric(rawText)
        if (cleanTerm && cleanText.includes(cleanTerm)) {
          return { match: true }
        }
        return { match: false, reason: 'nao_corresponde_identificador' }
      }

      if (type === 'frase_exata') {
        if (normText.includes(normTerm)) return { match: true }
        return { match: false, reason: 'nao_corresponde_frase' }
      }

      if (type === 'regex') {
        try {
          const re = new RegExp(term, 'i')
          if (re.test(rawText)) return { match: true }
          return { match: false, reason: 'nao_corresponde_regex' }
        } catch (e) {
          return { match: false, reason: 'regex_invalido' }
        }
      }

      const tokens = normTerm.split(/\s+/).filter((t) => t.length > 2)
      if (tokens.length === 0) {
        if (normText.includes(normTerm)) return { match: true }
        return { match: false, reason: 'nao_corresponde_termo' }
      }

      let matchCount = 0
      for (const t of tokens) {
        if (normText.includes(t)) matchCount++
      }
      if (matchCount === tokens.length) return { match: true }

      return { match: false, reason: 'baixa_relevancia' }
    }

    function parseDate(dStr) {
      if (!dStr) return null
      let parts = dStr.split(' ')[0].split('-')
      if (parts.length === 3) {
        return new Date(parts[0], parts[1] - 1, parts[2])
      }
      parts = dStr.split('/')
      if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0])
      }
      return null
    }

    function formatDateForIN(d) {
      if (!d) return ''
      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const yyyy = d.getFullYear()
      return `${dd}/${mm}/${yyyy}`
    }

    function formatDateStandard(d) {
      if (!d) return ''
      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const yyyy = d.getFullYear()
      return `${yyyy}-${mm}-${dd}`
    }

    const uas = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
    ]

    let activeCookies = []

    function fetchWithRetry(url, attempt = 1, uaIndex = 0) {
      const headers = {
        'User-Agent': uas[uaIndex % uas.length],
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      }

      if (activeCookies.length > 0) {
        headers['Cookie'] = activeCookies.join('; ')
      }

      let res = null
      try {
        res = $http.send({
          url: url,
          method: 'GET',
          headers: headers,
          timeout: 30,
        })

        if (res?.headers) {
          let setCookie = res?.headers['set-cookie'] || res?.headers['Set-Cookie']
          if (setCookie) {
            try {
              if (Array.isArray(setCookie)) setCookie = setCookie.join(',')
              if (typeof setCookie === 'string') {
                const newCookies = setCookie
                  .split(',')
                  .map((c) => c?.split(';')[0]?.trim())
                  .filter(Boolean)
                activeCookies = [...new Set([...activeCookies, ...newCookies])]
              }
            } catch (cookieErr) {}
          }
        }
      } catch (err) {
        if (attempt >= 3) {
          return { statusCode: 0, body: null }
        }
        sleep(2000 * attempt)
        return fetchWithRetry(url, attempt + 1, uaIndex + 1)
      }

      if (res && res.statusCode === 200) return res

      if (attempt >= 3) return res || { statusCode: 0, body: null }

      let delay = 2000 * attempt
      if (res && [403, 429].includes(res.statusCode)) delay = 5000 * attempt
      else if (res && [502, 503, 504].includes(res.statusCode)) delay = 3000 * attempt

      sleep(delay)
      return fetchWithRetry(url, attempt + 1, uaIndex + 1)
    }

    logAction(
      'Iniciando busca DOU',
      { q, publishFrom, publishTo, searchType, orgPrin },
      'info',
      'request',
    )

    let searchRecord = null
    try {
      const searchesCol = $app.findCollectionByNameOrId('searches')
      searchRecord = new Record(searchesCol)
      searchRecord.set('term', q)
      searchRecord.set('search_type', searchType)
      searchRecord.set('status', 'running')
      searchRecord.set('results_count', 0)
      searchRecord.set('start_date', publishFrom)
      searchRecord.set('end_date', publishTo)
      $app.save(searchRecord)
    } catch (e) {
      logAction('Erro ao criar registro em searches', { error: e.toString() }, 'error', 'request')
    }

    let scrapedItems = []
    const col = $app.findCollectionByNameOrId('publicacoes_dou')
    const orgId = e.auth?.getString('active_organization') || ''

    let hasScrapingSuccess = false
    let uniqueUrls = new Set()

    let currentPage = 0
    let newPage = 1
    let lastCursor = null // { score, id, displayDateSortable }
    let keepPaginating = true
    let pagesCount = 0

    while (keepPaginating && pagesCount < 15) {
      pagesCount++
      const params = new URLSearchParams()
      params.append('q', q)
      params.append('s', 'todos')
      params.append('exactDate', 'personalizado')
      params.append('sortType', '0')
      params.append('currentPage', currentPage.toString())
      params.append('newPage', newPage.toString())

      if (lastCursor) {
        params.append('useCursor', 'true')
        if (lastCursor.score) params.append('score', lastCursor.score.toString())
        if (lastCursor.id) params.append('id', lastCursor.id.toString())
        if (lastCursor.displayDateSortable)
          params.append('displayDate', lastCursor.displayDateSortable.toString())
      } else {
        params.append('useCursor', 'false')
      }

      if (publishFrom) params.append('publishFrom', formatDateForIN(parseDate(publishFrom)))
      if (publishTo) params.append('publishTo', formatDateForIN(parseDate(publishTo)))
      if (orgPrin) params.append('orgPrin', orgPrin)

      const inUrl = `https://www.in.gov.br/consulta/-/buscar/dou?${params.toString()}`

      const res = fetchWithRetry(inUrl, 1, 0)

      if (res.statusCode !== 200) {
        keepPaginating = false
        break
      }

      hasScrapingSuccess = true
      let html = decodeISO(res.body)

      if (
        html.toLowerCase().includes('captcha') ||
        html.toLowerCase().includes('acesso negado') ||
        html.toLowerCase().includes('cloudflare') ||
        html.toLowerCase().includes('incapsula') ||
        html.toLowerCase().includes('bloqueio')
      ) {
        logAction(
          'portal_blocked',
          {
            message: 'Bloqueio de WAF, Manutenção ou CAPTCHA detectado.',
            snippet: html.substring(0, 200),
          },
          'error',
          'request',
        )
        keepPaginating = false
        break
      }

      let rawJsonStr = null
      let startIdx = html.indexOf('params = {')
      if (startIdx === -1) {
        startIdx = html.indexOf('{"jsonArray":')
      } else {
        startIdx = html.indexOf('{', startIdx)
      }

      if (startIdx !== -1) {
        let brackets = 0
        let inString = false
        let escapeNext = false
        let endIdx = -1

        for (let i = startIdx; i < html.length; i++) {
          const char = html[i]
          if (escapeNext) {
            escapeNext = false
            continue
          }
          if (char === '\\') {
            escapeNext = true
            continue
          }
          if (char === '"') {
            inString = !inString
            continue
          }
          if (!inString) {
            if (char === '{') brackets++
            else if (char === '}') {
              brackets--
              if (brackets === 0) {
                endIdx = i
                break
              }
            }
          }
        }

        if (endIdx !== -1) {
          rawJsonStr = html.substring(startIdx, endIdx + 1)
        }
      }

      let jsonArray = []
      if (rawJsonStr) {
        try {
          const parsedObj = JSON.parse(rawJsonStr)
          jsonArray = parsedObj.jsonArray || []
        } catch (err) {
          const searchStr = '"jsonArray":'
          const idx = html.indexOf(searchStr)
          if (idx !== -1) {
            const arrStart = html.indexOf('[', idx)
            if (arrStart !== -1) {
              let arrBrackets = 0
              let arrInStr = false
              let arrEsc = false
              let arrEnd = -1
              for (let i = arrStart; i < html.length; i++) {
                const c = html[i]
                if (arrEsc) {
                  arrEsc = false
                  continue
                }
                if (c === '\\') {
                  arrEsc = true
                  continue
                }
                if (c === '"') {
                  arrInStr = !arrInStr
                  continue
                }
                if (!arrInStr) {
                  if (c === '[') arrBrackets++
                  else if (c === ']') {
                    arrBrackets--
                    if (arrBrackets === 0) {
                      arrEnd = i
                      break
                    }
                  }
                }
              }
              if (arrEnd !== -1) {
                try {
                  jsonArray = JSON.parse(html.substring(arrStart, arrEnd + 1))
                } catch (e2) {}
              }
            }
          }

          if (jsonArray.length === 0) {
            logAction(
              'parse_error',
              { message: 'Falha ao fazer parse do params', error: err?.toString() },
              'error',
              'parse_json',
            )
            keepPaginating = false
            break
          }
        }
      } else {
        keepPaginating = false
        break
      }

      if (jsonArray.length === 0) {
        keepPaginating = false
        break
      }

      const lastItem = jsonArray[jsonArray.length - 1]
      lastCursor = {
        score: lastItem.score,
        id: lastItem.classPK || lastItem.id,
        displayDateSortable:
          lastItem.displayDateSortable || lastItem.displayDate || lastItem.pubDate,
      }
      currentPage = newPage
      newPage++

      for (const item of jsonArray) {
        const title = cleanText(item.title || '')
        const urlTitleStr = item.urlTitle || ''
        const url = urlTitleStr ? `https://www.in.gov.br/web/dou/-/${urlTitleStr}` : item.url || ''

        let contentRaw = item.abstractContent || item.content || ''
        const content = cleanText(contentRaw)

        const hashInput = title + contentRaw + url
        const hash = $security.md5(hashInput)

        if (uniqueUrls.has(hash)) {
          continue
        }
        uniqueUrls.add(hash)

        const pubDate = item.pubDate || ''
        const matchResult = isMatch(content + ' ' + title, q, searchType)

        if (!matchResult.match) {
          logAction(
            'Publicação descartada',
            {
              url,
              page: pagesCount,
              discardReason: matchResult.reason,
              discardSnippet: content.substring(0, 150),
            },
            'info',
            'normalization',
          )
          continue
        }

        let parsedDate = ''
        if (pubDate) {
          const dObj = parseDate(pubDate)
          if (dObj) {
            parsedDate = `${formatDateStandard(dObj)} 00:00:00.000Z`
          }
        }

        const scrapedItem = {
          titulo: title,
          secao: cleanText(item.secaoDoDiario || ''),
          orgao: cleanText(item.pubName || item.hierarchyStr || ''),
          texto_bruto: contentRaw,
          texto_normalizado: content,
          url_origem: url,
          hash_conteudo: hash,
          fonte_coleta: 'DOU_SCRAPING',
          data_publicacao: parsedDate,
          data_coleta: new Date().toISOString().replace('T', ' '),
          status_processamento: 'processado',
          editionNumber: cleanText(item.editionNumber || ''),
          numberPage: cleanText(item.numberPage || ''),
          hierarchyStr: cleanText(item.hierarchyStr || ''),
          artType: mapArtType(cleanText(item.artType || '')),
          organization: orgId,
        }

        let isDuplicate = false
        try {
          const existing = $app.findFirstRecordByData('publicacoes_dou', 'hash_conteudo', hash)
          if (existing) {
            isDuplicate = true
            scrapedItems.push({
              id: existing.id,
              titulo: existing.getString('titulo'),
              secao: existing.getString('secao'),
              orgao: existing.getString('orgao'),
              texto_normalizado: existing.getString('texto_normalizado'),
              url_origem: existing.getString('url_origem'),
              data_publicacao: existing.getString('data_publicacao'),
              fonte_coleta: 'LOCAL_DB',
              editionNumber: existing.getString('editionNumber'),
              numberPage: existing.getString('numberPage'),
              hierarchyStr: existing.getString('hierarchyStr'),
              artType: existing.getString('artType'),
            })
          }
        } catch (_) {}

        if (!isDuplicate) {
          try {
            const record = new Record(col)
            Object.keys(scrapedItem).forEach((k) => {
              if (scrapedItem[k]) record.set(k, scrapedItem[k])
            })
            $app.save(record)
            scrapedItems.push({ id: record.id, ...scrapedItem })
          } catch (saveErr) {}
        }
      }

      if (jsonArray.length < 10) {
        keepPaginating = false
      } else {
        sleep(2000)
      }
    }

    if (searchRecord) {
      try {
        searchRecord.set('status', 'completed')
        searchRecord.set('results_count', scrapedItems.length)
        $app.save(searchRecord)
      } catch (e) {}
    }

    if (hasScrapingSuccess && scrapedItems.length > 0) {
      logAction('Scraping concluído com sucesso', { count: scrapedItems.length }, 'info', 'request')
      const uniqueItems = []
      const seenIds = new Set()
      for (const item of scrapedItems) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id)
          uniqueItems.push(item)
        }
      }
      return e.json(200, {
        success: true,
        count: uniqueItems.length,
        source: 'DOU_SCRAPING',
        items: uniqueItems,
      })
    }

    return e.json(200, { success: true, count: 0, source: 'DOU_SCRAPING', items: [] })
  },
  $apis.requireAuth(),
)
