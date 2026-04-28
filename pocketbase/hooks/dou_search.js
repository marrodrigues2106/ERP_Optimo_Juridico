routerAdd(
  'POST',
  '/backend/v1/dou/search',
  (e) => {
    const body = e.requestInfo().body || {}
    const q = (body.q || '').trim()
    const publishFrom = body.publishFrom || ''
    const publishTo = body.publishTo || ''
    const searchType = body.searchType || 'palavras_chave'

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

    function logAction(mensagem, metadados, status = 'Sucesso', etapa = 'request') {
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

    function normalizeText(text) {
      if (!text) return ''
      let norm = text.toLowerCase()
      try {
        norm = norm.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      } catch (err) {
        norm = norm
          .replace(/[áàâãä]/g, 'a')
          .replace(/[éèêë]/g, 'e')
          .replace(/[íìîï]/g, 'i')
          .replace(/[óòôõö]/g, 'o')
          .replace(/[úùûü]/g, 'u')
          .replace(/[ç]/g, 'c')
          .replace(/[ñ]/g, 'n')
      }
      return norm.replace(/\s+/g, ' ').trim()
    }

    function stripNonNumeric(str) {
      if (!str) return ''
      return str.replace(/\D/g, '')
    }

    function cleanContent(text) {
      if (!text) return ''
      let cleaned = text.replace(/<[^>]*>?/gm, ' ')
      cleaned = cleaned.replace(/\s+/g, ' ').trim()
      cleaned = cleaned.replace(
        /Este documento pode ser verificado no endereço eletrônico[^\.]*\./gi,
        '',
      )
      return cleaned.trim()
    }

    function isMatch(rawText, term, type) {
      if (!rawText) return { match: false, reason: 'empty_content' }

      const normText = normalizeText(rawText)
      const normTerm = normalizeText(term)

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
      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const yyyy = d.getFullYear()
      return `${dd}/${mm}/${yyyy}`
    }

    function formatDateStandard(d) {
      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const yyyy = d.getFullYear()
      return `${yyyy}-${mm}-${dd}`
    }

    function generateChunks(fromStr, toStr) {
      const chunks = []
      const dFrom = parseDate(fromStr)
      const dTo = parseDate(toStr)

      if (!dFrom || !dTo) {
        chunks.push({
          from: fromStr ? formatDateForIN(dFrom) : '',
          to: toStr ? formatDateForIN(dTo) : '',
        })
        return chunks
      }

      let current = new Date(dFrom.getTime())
      while (current <= dTo) {
        let chunkEnd = new Date(current.getTime() + 9 * 24 * 60 * 60 * 1000)
        if (chunkEnd > dTo) chunkEnd = new Date(dTo.getTime())

        chunks.push({
          from: formatDateForIN(current),
          to: formatDateForIN(chunkEnd),
        })

        current = new Date(chunkEnd.getTime() + 24 * 60 * 60 * 1000)
      }
      return chunks
    }

    const uas = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    ]

    let activeCookies = []

    function fetchWithRetry(url, attempt = 1, uaIndex = 0, forceNoCache = false) {
      const headers = {
        'User-Agent': uas[uaIndex % uas.length],
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      }
      if (forceNoCache) {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        headers['Pragma'] = 'no-cache'
        headers['Expires'] = '0'
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

        if (res && res.headers) {
          const setCookie = res.headers['set-cookie'] || res.headers['Set-Cookie']
          if (setCookie) {
            const newCookies = setCookie.split(',').map((c) => c.split(';')[0].trim())
            activeCookies = [...new Set([...activeCookies, ...newCookies])]
          }
        }
      } catch (err) {
        if (attempt >= 3) {
          logAction(
            'Falha ao buscar após tentativas máximas (Network/Timeout)',
            { url, error: err.toString() },
            'Falha',
            'request',
          )
          return { statusCode: 0, body: null }
        }
        let delay = 2000 * attempt
        logAction(
          `Erro de rede/timeout. Retentando em ${delay}ms (tentativa ${attempt + 1})`,
          { url },
          'Aviso',
          'request',
        )
        sleep(delay)
        return fetchWithRetry(url, attempt + 1, uaIndex + 1, forceNoCache)
      }

      if (res && res.statusCode === 200) return res

      if (attempt >= 3) {
        logAction(
          'Falha ao buscar após tentativas máximas (HTTP)',
          { url, statusCode: res ? res.statusCode : 0 },
          'Falha',
          'request',
        )
        return res || { statusCode: 0, body: null }
      }

      let delay = 2000 * attempt
      if (res && [403, 429].includes(res.statusCode)) {
        delay = 5000 * attempt
      } else if (res && [502, 503, 504].includes(res.statusCode)) {
        delay = 3000 * attempt
      }

      logAction(
        `Erro HTTP ${res ? res.statusCode : 0}. Retentando em ${delay}ms (tentativa ${attempt + 1})`,
        { url },
        'Aviso',
        'request',
      )
      sleep(delay)
      return fetchWithRetry(url, attempt + 1, uaIndex + 1, forceNoCache)
    }

    logAction(
      'Iniciando busca DOU',
      { q, publishFrom, publishTo, searchType },
      'Sucesso',
      'request',
    )

    let scrapedItems = []
    let fallbackItems = []

    const dateChunks = generateChunks(publishFrom, publishTo)
    logAction('Partições geradas', { chunksCount: dateChunks.length }, 'Sucesso', 'request')

    const col = $app.findCollectionByNameOrId('publicacoes_dou')
    const orgId = e.auth?.getString('active_organization') || ''

    let hasScrapingSuccess = false
    let uniqueUrls = new Set()

    for (let cIdx = 0; cIdx < dateChunks.length; cIdx++) {
      if (cIdx > 0) sleep(3000)

      const chunk = dateChunks[cIdx]
      let start = 0
      let delta = 20
      let keepPaginating = true
      let lastPageId = null
      let consecutiveIdenticalId = 0
      let uaIndex = 0
      let pagesCount = 0
      let consecutiveEmptyPages = 0
      let forceNoCache = false
      let useCursor = true

      while (keepPaginating && pagesCount < 50) {
        pagesCount++
        const params = new URLSearchParams()
        params.append('q', q)
        params.append('s', 'todos')
        params.append('exactDate', 'personalizado')
        params.append('sortType', '0')
        params.append('delta', delta.toString())
        params.append('start', start.toString())
        if (!useCursor) {
          params.append('useCursor', 'false')
        }

        if (chunk.from) params.append('publishFrom', chunk.from)
        if (chunk.to) params.append('publishTo', chunk.to)

        const inUrl = `https://www.in.gov.br/consulta/-/buscar/dou?${params.toString()}`

        const res = fetchWithRetry(inUrl, 1, uaIndex, forceNoCache)

        if (res.statusCode !== 200) {
          keepPaginating = false
          break
        }

        hasScrapingSuccess = true
        let html = decodeISO(res.body)

        let jsonArrayMatch =
          html.match(/"jsonArray":\s*(\[.*?\])\s*,\s*"q"/s) ||
          html.match(/"jsonArray":\s*(\[.*?\])\s*\}/s)
        if (!jsonArrayMatch) {
          const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || []
          for (const s of scripts) {
            const m = s.match(/"jsonArray":\s*(\[.*?\])\s*(,|})/s)
            if (m) {
              jsonArrayMatch = m
              break
            }
          }
        }

        if (jsonArrayMatch && jsonArrayMatch[1]) {
          let jsonArray = []
          try {
            jsonArray = JSON.parse(jsonArrayMatch[1])
          } catch (err) {
            logAction(
              'Erro ao fazer parse do jsonArray',
              { error: err.toString() },
              'Falha',
              'parsing',
            )
            keepPaginating = false
            break
          }

          if (jsonArray.length === 0) {
            keepPaginating = false
            break
          }

          const currentPageLastId =
            jsonArray[jsonArray.length - 1].urlTitle ||
            jsonArray[jsonArray.length - 1].id ||
            'unknown'

          if (currentPageLastId === lastPageId && currentPageLastId !== 'unknown') {
            consecutiveIdenticalId++
            logAction(
              'Loop de paginação detectado',
              { consecutiveIdenticalId, start, currentPageLastId },
              'Aviso',
              'request',
            )

            if (consecutiveIdenticalId === 1) {
              start += 1
              useCursor = false
              logAction(
                'Aplicando Estratégia 1: Desabilitar Cursor e Pulo Temporal',
                { start, useCursor },
                'Aviso',
                'request',
              )
            } else if (consecutiveIdenticalId === 2) {
              delta = 21
              useCursor = false
              logAction(
                'Aplicando Estratégia 2: Quebra de Cache e Delta',
                { delta, useCursor },
                'Aviso',
                'request',
              )
            } else if (consecutiveIdenticalId === 3) {
              uaIndex++
              forceNoCache = true
              activeCookies = []
              delta = 25
              start += delta
              useCursor = false
              logAction(
                'Aplicando Estratégia 3: Reset de Sessão e Rotação de UA',
                { uaIndex, delta, start, useCursor },
                'Aviso',
                'request',
              )
            } else {
              logAction(
                'Loop irrecuperável, abortando paginação desta partição',
                {},
                'Falha',
                'request',
              )
              keepPaginating = false
              break
            }
          } else {
            consecutiveIdenticalId = 0
            lastPageId = currentPageLastId
            forceNoCache = false
            delta = 20
            useCursor = true
          }

          let pageValidItems = 0

          for (const item of jsonArray) {
            const title = cleanContent(item.title || '')
            const urlTitleStr = item.urlTitle || ''
            const url = urlTitleStr ? `https://www.in.gov.br/web/dou/-/${urlTitleStr}` : ''

            let contentRaw = item.abstractContent || item.content || ''
            const content = cleanContent(contentRaw)

            const hashInput = title + contentRaw + url
            const hash = $security.md5(hashInput)

            if (uniqueUrls.has(hash)) {
              logAction(
                'Publicação descartada',
                {
                  url,
                  page: pagesCount,
                  discardReason: 'Duplicate',
                  discardSnippet: title.substring(0, 150),
                },
                'Sucesso',
                'normalization',
              )
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
                'Sucesso',
                'normalization',
              )
              continue
            }

            let parsedDate = ''
            let isValidDate = true
            if (pubDate) {
              const dObj = parseDate(pubDate)
              if (dObj) {
                parsedDate = `${formatDateStandard(dObj)} 00:00:00.000Z`
                if (publishFrom) {
                  const pFrom = parseDate(publishFrom)
                  if (pFrom && dObj < pFrom) isValidDate = false
                }
                if (publishTo) {
                  const pTo = parseDate(publishTo)
                  if (pTo && dObj > pTo) isValidDate = false
                }
              } else {
                isValidDate = false
                logAction('Aviso de Data Inconsistente', { url, pubDate }, 'Aviso', 'normalization')
              }
            } else {
              isValidDate = false
              logAction('Aviso de Data Ausente', { url }, 'Aviso', 'normalization')
            }

            if (!isValidDate) {
              logAction(
                'Publicação descartada',
                {
                  url,
                  page: pagesCount,
                  discardReason: 'Out of Date',
                  discardSnippet: content.substring(0, 150),
                },
                'Sucesso',
                'normalization',
              )
              continue
            }

            pageValidItems++

            const scrapedItem = {
              titulo: title,
              secao: cleanContent(item.secaoDoDiario || ''),
              orgao: cleanContent(item.pubName || item.hierarchyStr || ''),
              texto_bruto: content,
              texto_normalizado: normalizeText(content),
              url_origem: url,
              hash_conteudo: hash,
              fonte_coleta: 'DOU_SCRAPING',
              data_publicacao: parsedDate,
              data_coleta: new Date().toISOString().replace('T', ' '),
              status_processamento: 'processado',
              editionNumber: cleanContent(item.editionNumber || ''),
              numberPage: cleanContent(item.numberPage || ''),
              hierarchyStr: cleanContent(item.hierarchyStr || ''),
              artType: cleanContent(item.artType || ''),
              organization: orgId,
            }

            let isDuplicate = false
            try {
              const existing = $app.findFirstRecordByData('publicacoes_dou', 'hash_conteudo', hash)
              if (existing) {
                isDuplicate = true
                logAction(
                  'Publicação descartada',
                  {
                    url,
                    page: pagesCount,
                    discardReason: 'ja_no_banco',
                    discardSnippet: content.substring(0, 150),
                  },
                  'Sucesso',
                  'normalization',
                )
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
                const existingGaz = $app.findFirstRecordByData(
                  'gazette_publications',
                  'hash_conteudo',
                  hash,
                )
                if (existingGaz) {
                  isDuplicate = true
                  logAction(
                    'Publicação descartada',
                    {
                      url,
                      page: pagesCount,
                      discardReason: 'ja_no_banco',
                      discardSnippet: content.substring(0, 150),
                    },
                    'Sucesso',
                    'normalization',
                  )
                }
              } catch (_) {}
            }

            if (!isDuplicate) {
              try {
                const record = new Record(col)
                Object.keys(scrapedItem).forEach((k) => {
                  if (scrapedItem[k]) record.set(k, scrapedItem[k])
                })
                $app.save(record)
                scrapedItems.push({
                  id: record.id,
                  ...scrapedItem,
                })
              } catch (saveErr) {
                logAction(
                  'Erro ao salvar publicação',
                  { error: saveErr.toString(), url },
                  'Falha',
                  'normalization',
                )
              }
            }
          }

          if (pageValidItems === 0) {
            consecutiveEmptyPages++
            if (consecutiveEmptyPages >= 10) {
              logAction(
                'Muitas páginas vazias consecutivas, abortando partição',
                { chunk, pagesCount },
                'Aviso',
                'request',
              )
              keepPaginating = false
              break
            }
          } else {
            consecutiveEmptyPages = 0
          }

          if (jsonArray.length < 20 && consecutiveIdenticalId === 0) {
            keepPaginating = false
          } else {
            if (consecutiveIdenticalId === 0) {
              start += delta
            }
            sleep(2000)
          }
        } else {
          keepPaginating = false
        }
      }
    }

    if (hasScrapingSuccess && scrapedItems.length > 0) {
      logAction(
        'Scraping concluído com sucesso',
        { count: scrapedItems.length },
        'Sucesso',
        'request',
      )
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
    } else if (hasScrapingSuccess && scrapedItems.length === 0) {
      return e.json(200, { success: true, count: 0, source: 'DOU_SCRAPING', items: [] })
    }

    try {
      logAction('Iniciando fallback Querido Diário', { q }, 'Sucesso', 'request')
      const qdUrl = `https://queridodiario.ok.org.br/api/gazettes?querystring=${encodeURIComponent(q)}`

      let res
      let attempt = 0
      let delay = 4000

      while (attempt < 3) {
        res = $http.send({
          url: qdUrl,
          method: 'GET',
          timeout: 30,
        })
        if (res.statusCode === 200) {
          break
        } else if ([401, 403, 429].includes(res.statusCode) || res.statusCode >= 500) {
          attempt++
          if (attempt >= 3) break
          sleep(delay)
          delay *= 2
        } else {
          break
        }
      }

      if (res && res.statusCode === 200) {
        const data = res.json
        if (data && data.gazettes) {
          for (const item of data.gazettes) {
            const title = cleanContent(`Diário de ${item.territory_name}`)
            const url = item.url || ''
            let contentRaw = item.excerpts ? item.excerpts.join('\n') : ''
            const content = cleanContent(contentRaw)

            const matchResult = isMatch(content + ' ' + title, q, searchType)
            if (!matchResult.match) {
              logAction(
                'Publicação QD descartada',
                {
                  url,
                  discardReason: matchResult.reason,
                  discardSnippet: content.substring(0, 150),
                },
                'Sucesso',
                'normalization',
              )
              continue
            }

            const pubDate = item.date ? `${item.date} 00:00:00.000Z` : ''

            let parsedDate = ''
            let isValidDate = true
            if (item.date) {
              const dParts = item.date.split('-')
              if (dParts.length === 3) {
                const dObj = new Date(dParts[0], dParts[1] - 1, dParts[2])
                if (publishFrom) {
                  const pFrom = parseDate(publishFrom)
                  if (pFrom && dObj < pFrom) isValidDate = false
                }
                if (publishTo) {
                  const pTo = parseDate(publishTo)
                  if (pTo && dObj > pTo) isValidDate = false
                }
              }
            }

            if (!isValidDate) {
              logAction(
                'Publicação QD descartada',
                {
                  url,
                  discardReason: 'Out of Date',
                  discardSnippet: content.substring(0, 150),
                },
                'Sucesso',
                'normalization',
              )
              continue
            }

            const hashInput = title + contentRaw + url
            const hash = $security.md5(hashInput)

            const qdItem = {
              titulo: title,
              secao: '',
              orgao: cleanContent(item.territory_name || ''),
              texto_bruto: content,
              texto_normalizado: normalizeText(content),
              url_origem: url,
              hash_conteudo: hash,
              fonte_coleta: 'QUERIDO_DIARIO',
              data_publicacao: pubDate,
              data_coleta: new Date().toISOString().replace('T', ' '),
              status_processamento: 'processado',
              organization: orgId,
            }

            let isDuplicate = false
            try {
              const existing = $app.findFirstRecordByData('publicacoes_dou', 'hash_conteudo', hash)
              if (existing) {
                isDuplicate = true
                fallbackItems.push({
                  id: existing.id,
                  titulo: existing.getString('titulo'),
                  secao: existing.getString('secao'),
                  orgao: existing.getString('orgao'),
                  texto_normalizado: existing.getString('texto_normalizado'),
                  url_origem: existing.getString('url_origem'),
                  data_publicacao: existing.getString('data_publicacao'),
                  fonte_coleta: 'LOCAL_DB',
                })
              }
            } catch (_) {}

            if (!isDuplicate) {
              try {
                const existingGaz = $app.findFirstRecordByData(
                  'gazette_publications',
                  'hash_conteudo',
                  hash,
                )
                if (existingGaz) {
                  isDuplicate = true
                }
              } catch (_) {}
            }

            if (!isDuplicate) {
              try {
                const record = new Record(col)
                Object.keys(qdItem).forEach((k) => {
                  if (qdItem[k]) record.set(k, qdItem[k])
                })
                $app.save(record)
                fallbackItems.push({
                  id: record.id,
                  ...qdItem,
                })
              } catch (saveErr) {}
            }
          }
        }
      }
    } catch (err) {
      logAction('Erro fallback QD', { error: err.toString() }, 'Falha', 'request')
    }

    logAction(
      'Busca finalizada',
      { count: fallbackItems.length, source: 'QUERIDO_DIARIO' },
      'Sucesso',
      'request',
    )
    return e.json(200, {
      success: true,
      count: fallbackItems.length,
      source: 'QUERIDO_DIARIO',
      items: fallbackItems,
    })
  },
  $apis.requireAuth(),
)
