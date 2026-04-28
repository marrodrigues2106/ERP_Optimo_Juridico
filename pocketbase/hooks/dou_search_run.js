routerAdd(
  'POST',
  '/backend/v1/dou/search/run',
  (e) => {
    const body = e.requestInfo().body || {}
    const q = (body.q || '').trim()
    const publishFrom = body.publishFrom || ''
    const publishTo = body.publishTo || ''
    const orgPrin = body.orgPrin || ''
    const jobId = body.jobId || 'unknown'

    const user = e.auth
    if (!user) return e.unauthorizedError('Não autorizado')

    function logAction(mensagem, metadados, status = 'info', etapa = 'processamento') {
      try {
        const sysCol = $app.findCollectionByNameOrId('logs_processamento')
        const sysR = new Record(sysCol)
        sysR.set('etapa', etapa)
        sysR.set('status', status)
        sysR.set('mensagem', mensagem)
        sysR.set('data_hora', new Date().toISOString().replace('T', ' '))
        const meta = metadados || {}
        meta.jobId = jobId
        sysR.set('metadados', meta)
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

    function cleanText(text) {
      if (!text) return ''
      let cleaned = text.replace(/<[^>]*>?/gm, ' ')
      return cleaned.replace(/\s+/g, ' ').trim()
    }

    function superNormalize(str) {
      if (!str) return ''
      let s = str.toLowerCase()
      const accents = 'áàãâäéèêëíìîïóòõôöúùûüçñ'
      const without = 'aaaaaeeeeiiiiooooouuuucn'
      for (let i = 0; i < accents.length; i++) {
        s = s.split(accents[i]).join(without[i])
      }
      s = s.replace(/[^a-z0-9\s]/g, ' ')
      return s.replace(/\s+/g, ' ').trim()
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

    function isMatch(rawText, term) {
      if (!rawText) return { match: false, reason: 'empty_content' }
      const normText = superNormalize(rawText)
      const exactMatchRegex = /^"([^"]+)"$/
      const match = term.trim().match(exactMatchRegex)

      if (match) {
        const exactPhrase = superNormalize(match[1])
        if (normText.includes(exactPhrase)) return { match: true }
        return { match: false, reason: 'nao_corresponde_frase_exata' }
      }

      const normTerm = superNormalize(term)
      const tokens = normTerm.split(/\s+/).filter((t) => t.length > 0)
      if (tokens.length === 0) return { match: false, reason: 'termo_vazio' }

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
      if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2])
      parts = dStr.split('/')
      if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0])
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
      if (activeCookies.length > 0) headers['Cookie'] = activeCookies.join('; ')

      let res = null
      try {
        res = $http.send({ url: url, method: 'GET', headers: headers, timeout: 30 })
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
        if (attempt >= 3) return { statusCode: 0, body: null }
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

    logAction('Conectando ao Portal', { q }, 'info', 'Conectando')

    let scrapedItems = []
    const col = $app.findCollectionByNameOrId('publicacoes_dou')
    const orgId = e.auth?.getString('active_organization') || ''

    let hasScrapingSuccess = false
    let uniqueUrls = new Set()

    let currentPage = 0
    let newPage = 1
    let lastCursor = null
    let keepPaginating = true
    let pagesCount = 0

    while (keepPaginating && pagesCount < 15) {
      pagesCount++
      logAction(`Lendo Página ${pagesCount}`, { page: pagesCount }, 'info', 'Lendo Página')

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
        logAction(
          `Erro ao ler página ${pagesCount}`,
          { statusCode: res.statusCode },
          'error',
          'Erro de Conexão',
        )
        keepPaginating = false
        break
      }

      hasScrapingSuccess = true
      let html = decodeISO(res.body)

      if (
        html.toLowerCase().includes('captcha') ||
        html.toLowerCase().includes('acesso negado') ||
        html.toLowerCase().includes('cloudflare')
      ) {
        logAction(
          'portal_blocked',
          { message: 'Bloqueio detectado.', snippet: html.substring(0, 200) },
          'error',
          'request',
        )
        keepPaginating = false
        break
      }

      let rawJsonStr = null
      let startIdx = html.indexOf('params = {')
      if (startIdx === -1) startIdx = html.indexOf('{"jsonArray":')
      else startIdx = html.indexOf('{', startIdx)

      if (startIdx !== -1) {
        let brackets = 0,
          inString = false,
          escapeNext = false,
          endIdx = -1
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
        if (endIdx !== -1) rawJsonStr = html.substring(startIdx, endIdx + 1)
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
              let arrBrackets = 0,
                arrInStr = false,
                arrEsc = false,
                arrEnd = -1
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
        }
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

      let pendingItems = []

      for (const item of jsonArray) {
        const title = cleanText(item.title || '')
        const urlTitleStr = item.urlTitle || ''
        const url = urlTitleStr ? `https://www.in.gov.br/web/dou/-/${urlTitleStr}` : item.url || ''
        let contentRaw = item.abstractContent || item.content || ''
        const content = cleanText(contentRaw)

        const hashInput = title + contentRaw + url
        const hash = $security.md5(hashInput)

        if (uniqueUrls.has(hash)) continue
        uniqueUrls.add(hash)

        const pubDate = item.pubDate || ''
        const matchResult = isMatch(content + ' ' + title, q)

        if (!matchResult.match) continue

        let parsedDate = ''
        if (pubDate) {
          const dObj = parseDate(pubDate)
          if (dObj) parsedDate = `${formatDateStandard(dObj)} 00:00:00.000Z`
        }

        pendingItems.push({
          hash: hash,
          data: {
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
          },
        })
      }

      logAction(
        `Processando Lote ${pagesCount}`,
        { itemsCount: pendingItems.length },
        'info',
        'Processando Lote',
      )

      let existingHashes = new Set()
      if (pendingItems.length > 0) {
        const hashList = pendingItems.map((p) => p.hash)
        try {
          const hashFilter = hashList.map((h) => `hash_conteudo = '${h}'`).join(' || ')
          const existingRecords = $app.findRecordsByFilter(
            'publicacoes_dou',
            hashFilter,
            '',
            hashList.length,
          )
          for (const rec of existingRecords) {
            existingHashes.add(rec.getString('hash_conteudo'))
          }
        } catch (e) {}
      }

      let savedCount = 0
      for (const p of pendingItems) {
        if (!existingHashes.has(p.hash)) {
          try {
            const record = new Record(col)
            Object.keys(p.data).forEach((k) => {
              if (p.data[k]) record.set(k, p.data[k])
            })
            $app.save(record)
            scrapedItems.push({ id: record.id, ...p.data })
            savedCount++
          } catch (saveErr) {}
        }
      }

      if (jsonArray.length < 10) {
        keepPaginating = false
      }
    }

    logAction('Finalizado', { totalScraped: scrapedItems.length }, 'success', 'Finalizado')

    if (jobId !== 'unknown') {
      try {
        const searchRec = $app.findRecordById('searches', jobId)
        searchRec.set('status', 'completed')
        searchRec.set('results_count', scrapedItems.length)
        $app.save(searchRec)
      } catch (e) {}
    }

    return e.json(200, { success: true, count: scrapedItems.length, source: 'DOU_SCRAPING' })
  },
  $apis.requireAuth(),
)
