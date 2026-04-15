cronAdd('dou_datajud_ingestion_daily', '0 3 * * *', () => {
  console.log('[Monitoring] Starting unified background term search...')

  const pubDou = $app.findCollectionByNameOrId('publicacoes_dou')
  const logs = $app.findCollectionByNameOrId('logs_processamento')
  const notifsCol = $app.findCollectionByNameOrId('lawsuit_notifications')

  const normalizeText = (str) => {
    if (!str) return ''
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[\r\n\t\-\/]+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const logProcess = (etapa, status, msg, termoStr = '', fonte = '') => {
    try {
      const logRec = new Record(logs)
      logRec.set('etapa', etapa)
      logRec.set('status', status)
      logRec.set('mensagem', msg)
      logRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
      $app.save(logRec)
      return logRec.id
    } catch (e) {
      console.error('Log error', e)
      return null
    }
  }

  try {
    const terms = $app.findRecordsByFilter('termos_monitorados', 'ativo = true', '', 100, 0)
    if (terms.length === 0) return

    const configs = $app.findRecordsByFilter('monitoring_configs', '', '', 1, 0)
    const config = configs.length > 0 ? configs[0] : null

    const douSections = config ? config.get('dou_sections') || '1,2,3,Extra' : '1,2,3,Extra'
    const territoryId = config ? config.get('territory_id') : ''
    const departmentIgnore = config ? config.get('department_ignore') : ''
    const ignoreSignature = config ? config.get('ignore_signature_match') : true
    const datajudApiKey = config ? config.get('apiKey') : ''
    const isExactSearch = config ? config.get('is_exact_search') : false

    let monitoredTribunals = ['tjrj']
    try {
      const activeTribunals = $app.findRecordsByFilter('tribunals', 'active = true', '', 100, 0)
      if (activeTribunals.length > 0) {
        monitoredTribunals = activeTribunals
          .map((t) =>
            String(t.get('alias') || '')
              .toLowerCase()
              .trim(),
          )
          .filter(Boolean)
      }
    } catch (e) {}

    const today = new Date().toISOString().split('T')[0]
    const todayDDMMYYYY = today.split('-').reverse().join('/')

    let users = []
    try {
      users = $app.findRecordsByFilter('users', '1=1', '', 100, 0)
    } catch (e) {}

    for (let t of terms) {
      const termStr = t.get('termo')
      const searchTerm = isExactSearch ? `"${termStr}"` : termStr
      const ignoredTerms = t.get('termos_ignorados')
        ? t
            .get('termos_ignorados')
            .split(',')
            .map((s) => s.trim().toLowerCase())
        : []

      const searchId = logProcess(
        'Monitoramento Unificado',
        'Processando',
        `Buscando termo: ${termStr}`,
      )

      let combinedResults = []
      let sourceSuccess = false
      let sourceUsed = ''

      // Priority 1: Official IN API (DOU) Direct Scraping
      try {
        let page = 1
        let hasMore = true
        let lastScore = ''
        let lastId = ''
        let lastDisplayDate = ''

        while (page <= 3 && hasMore) {
          let url = `https://www.in.gov.br/consulta/-/buscar/dou?q=${encodeURIComponent(searchTerm)}&s=do1,do2,do3,doextra&exactDate=personalizado&publishFrom=${todayDDMMYYYY}&publishTo=${todayDDMMYYYY}&sortType=0&delta=20&currentPage=${page}&orgPrin=`

          if (page > 1 && lastScore && lastId && lastDisplayDate) {
            url += `&newPage=${page}&score=${lastScore}&id=${lastId}&displayDate=${lastDisplayDate}`
          }

          const start = Date.now()
          let statusCode = 0
          let errorMsg = ''
          let html = ''

          let attempt = 0
          let maxRetries = 3
          while (attempt < maxRetries) {
            try {
              const res = $http.send({
                url: url,
                method: 'GET',
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                },
                timeout: 15,
              })
              statusCode = res.statusCode

              if (res.statusCode === 200) {
                if (typeof res.body === 'string') {
                  html = res.body
                } else if (res.body) {
                  try {
                    let bytes = new Uint8Array(res.body)
                    let result = []
                    for (let i = 0; i < bytes.length; i += 8000) {
                      let end = i + 8000 > bytes.length ? bytes.length : i + 8000
                      result.push(String.fromCharCode.apply(null, bytes.subarray(i, end)))
                    }
                    let latin1 = result.join('')
                    try {
                      html = decodeURIComponent(escape(latin1))
                    } catch (e) {
                      html = latin1
                    }
                  } catch (e) {
                    html = String(res.body)
                  }
                }
                break // success
              } else if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 429 || res.statusCode >= 500) {
                attempt++
                if (attempt >= maxRetries) {
                  errorMsg = `Bloqueio/Erro (HTTP ${res.statusCode}) após ${maxRetries} tentativas`
                  break
                }
                let delay = attempt * 4000
                let startWait = Date.now()
                while(Date.now() - startWait < delay) {}
                continue
              } else {
                errorMsg = `HTTP Error ${res.statusCode}`
                break
              }
            } catch (e) {
              attempt++
              statusCode = 500
              if (attempt >= maxRetries) {
                errorMsg = String(e)
                break
              }
              let delay = attempt * 3000
              let startWait = Date.now()
              while(Date.now() - startWait < delay) {}
            }
          }

          const latency = Date.now() - start

          try {
            const logRec = new Record(logs)
            logRec.set('etapa', 'Conexão HTTP - DOU')
            logRec.set(
              'status',
              statusCode === 200
                ? 'Sucesso'
                : statusCode === 401 || statusCode === 403 || statusCode === 429
                  ? 'Bloqueio Funcional'
                  : 'Erro',
            )
            logRec.set(
              'mensagem',
              `URL: ${url} | Status: ${statusCode} | Latência: ${latency}ms | Erro: ${errorMsg}`,
            )
            logRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
            $app.save(logRec)
          } catch (e) {}

          if (statusCode === 200 && html) {
            const scriptMatch = html.match(
              /<script[^>]*id="_br_com_seatecnologia_in_buscadou_BuscaDouPortlet_params"[^>]*>([\s\S]*?)<\/script>/,
            )
            if (scriptMatch && scriptMatch[1]) {
              try {
                const parsed = JSON.parse(scriptMatch[1].trim())
                if (parsed.jsonArray && parsed.jsonArray.length > 0) {
                  parsed.jsonArray.forEach((item) => {
                    combinedResults.push({
                      source: 'DOU',
                      title: item.title || item.artType || 'Publicação DOU',
                      section: item.artType || 'Seção 1',
                      department: item.pubName || item.hierarchyStr || 'DOU',
                      date: item.pubDate || todayDDMMYYYY,
                      abstract: item.content || '',
                      text: item.content || '',
                      url: item.urlTitle ? `https://www.in.gov.br/web/dou/-/${item.urlTitle}` : '',
                      tipo_ato: item.artType || '',
                      orgao_principal:
                        item.pubName || (item.hierarchyStr ? item.hierarchyStr.split('/')[0] : ''),
                      organizacao_subordinada: item.hierarchyStr
                        ? item.hierarchyStr.split('/').slice(1).join('/')
                        : '',
                    })
                  })

                  const lastItem = parsed.jsonArray[parsed.jsonArray.length - 1]
                  lastScore = lastItem.score || ''
                  lastId = lastItem.id || ''
                  lastDisplayDate = lastItem.pubDate || ''

                  sourceSuccess = true
                  sourceUsed = 'DOU_SCRAPING'
                  if (parsed.jsonArray.length < 20) hasMore = false
                } else {
                  sourceSuccess = true
                  sourceUsed = 'DOU_SCRAPING'
                  hasMore = false
                }
              } catch (e) {
                try {
                  const logRec = new Record(logs)
                  logRec.set('etapa', 'Conexão HTTP - DOU')
                  logRec.set('status', 'Erro')
                  logRec.set('mensagem', `JSON Parsing Error: ${String(e)}`)
                  logRec.set(
                    'data_hora',
                    new Date().toISOString().replace('T', ' ').substring(0, 19),
                  )
                  $app.save(logRec)
                } catch (err) {}
                hasMore = false
              }
            } else {
              hasMore = false
            }
          } else {
            hasMore = false
          }
          page++
        }
      } catch (e) {}

      // Priority 2 (Fallback): Querido Diário API
      if (!sourceSuccess && territoryId) {
        const start = Date.now()
        let statusCode = 0
        let errorMsg = ''
        const url = `https://queridodiario.ok.org.br/api/gazettes?querystring=${encodeURIComponent(searchTerm)}&published_since=${today}&territory_ids=${territoryId}&excerpt_size=400`

        try {
          const qdRes = $http.send({
            url: url,
            method: 'GET',
            timeout: 10,
          })
          statusCode = qdRes.statusCode
          if (qdRes.statusCode === 200 && qdRes.json && qdRes.json.gazettes) {
            combinedResults = combinedResults.concat(
              qdRes.json.gazettes.map((g) => ({
                source: 'Querido Diário',
                title: 'Publicação Municipal ' + g.territory_name,
                section: 'Municipal',
                department: g.territory_name,
                date: g.date || today,
                abstract: g.excerpts?.[0] || '',
                text: g.excerpts?.[0] || g.excerpt || '',
                url: g.url || '',
                tipo_ato: 'Ato Municipal',
                orgao_principal: g.territory_name,
                organizacao_subordinada: '',
              })),
            )
            sourceSuccess = true
            sourceUsed = 'QUERIDO_DIARIO'
          } else if (qdRes.statusCode === 403) {
            errorMsg = 'Bloqueio Funcional - 403 Forbidden'
          } else {
            errorMsg = `HTTP Error ${qdRes.statusCode}`
          }
        } catch (e) {
          statusCode = 500
          errorMsg = String(e)
        }

        const latency = Date.now() - start
        try {
          const logRec = new Record(logs)
          logRec.set('etapa', 'Conexão HTTP - Querido Diário')
          logRec.set(
            'status',
            statusCode === 200 ? 'Sucesso' : statusCode === 403 ? 'Bloqueio Funcional' : 'Erro',
          )
          logRec.set(
            'mensagem',
            `URL: ${url} | Status: ${statusCode} | Latência: ${latency}ms | Erro: ${errorMsg}`,
          )
          logRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
          $app.save(logRec)
        } catch (e) {}
      }

      // Priority 3: Local Cache
      if (!sourceSuccess) {
        try {
          const cache = $app.findRecordsByFilter(
            'publicacoes_dou',
            `texto_normalizado ~ "${searchTerm.toLowerCase()}" && data_publicacao >= "${today} 00:00:00"`,
            '',
            20,
            0,
          )
          if (cache.length > 0) {
            sourceSuccess = true
            sourceUsed = 'CACHE_LOCAL'
          }
        } catch (e) {}
      }

      // Priority 4: Recovery (Scheduled Reprocessing)
      if (!sourceSuccess) {
        logProcess(
          'Monitoramento Unificado',
          'Fila de Reprocessamento',
          `Falha ao buscar termo: ${termStr} nas fontes DOU e Querido Diário. Marcado como pendente na fila.`,
        )
        continue
      }

      // Filter and Save Results
      let savedCount = 0
      for (let item of combinedResults) {
        let cleanText = (item.text || '').replace(/<[^>]*>?/gm, '').trim()
        if (ignoreSignature) {
          cleanText = cleanText.replace(
            /Este documento pode ser verificado no endereço eletrônico.*/gi,
            '',
          )
        }
        let cleanTitle = (item.title || item.tipo_ato || 'Publicação').replace(/<[^>]*>?/gm, '').trim()
        let rawFullText = `${cleanTitle} ${cleanText} ${item.department || ''}`
        let fullTextNormalized = normalizeText(rawFullText)

        const hasIgnored = ignoredTerms.some((it) => it && fullTextNormalized.includes(normalizeText(it)))
        if (hasIgnored) continue

        if (
          departmentIgnore &&
          normalizeText(item.department).includes(normalizeText(departmentIgnore))
        )
          continue
        if (item.source === 'DOU') {
          const matchSec = douSections
            .split(',')
            .some((sec) => normalizeText(item.section).includes(normalizeText(sec.trim())))
          if (!matchSec) continue
        }

        const searchType = t.get('tipo_termo') || 'palavra-chave'
        let pass = true
        
        if (searchType === 'frase' || isExactSearch) {
          let exact = termStr.trim()
          if ((exact.startsWith('"') && exact.endsWith('"')) || (exact.startsWith("'") && exact.endsWith("'"))) {
            exact = exact.substring(1, exact.length - 1).trim()
          }
          let exactNormalized = normalizeText(exact)
          pass = fullTextNormalized.includes(exactNormalized)
        } else if (searchType === 'regex') {
          try {
            const regex = new RegExp(termStr, 'i')
            pass = regex.test(rawFullText)
          } catch (err) {
            pass = false
          }
        } else {
          const tokens = normalizeText(termStr).split(/\s+/)
          const titleNorm = normalizeText(cleanTitle)
          const contentNorm = normalizeText(cleanText)
          const hierarchyNorm = normalizeText(item.department || '')
          
          let score = 0
          let matchCount = 0
          for (const tkn of tokens) {
            let matched = false
            if (titleNorm.includes(tkn)) { score += 3; matched = true; }
            else if (contentNorm.includes(tkn)) { score += 2; matched = true; }
            else if (hierarchyNorm.includes(tkn)) { score += 1; matched = true; }
            if (matched) matchCount++;
          }
          pass = (matchCount / tokens.length) >= 0.5
        }

        if (!pass) continue

        const hash = $security.md5(normalizeText(cleanTitle) + normalizeText(cleanText) + (item.url || ''))
        try {
          $app.findFirstRecordByData('publicacoes_dou', 'hash_conteudo', hash)
          continue
        } catch (_) {}

        let pubDate = item.date
        if (pubDate && pubDate.includes('/')) {
          const parts = pubDate.split('/')
          if (parts.length === 3) pubDate = `${parts[2]}-${parts[1]}-${parts[0]}`
        }
        if (!pubDate.includes(':')) pubDate = pubDate + ' 00:00:00'

        const record = new Record(pubDou)
        record.set('titulo', cleanTitle)
        record.set('secao', item.section)
        record.set('orgao', item.department)
        record.set('texto_bruto', cleanText)
        record.set('texto_normalizado', fullTextNormalized)
        record.set('url_origem', item.url)
        record.set('hash_conteudo', hash)
        record.set('fonte_coleta', item.source)
        record.set('data_publicacao', pubDate)
        record.set('data_coleta', new Date().toISOString().replace('T', ' ').substring(0, 19))
        record.set('status_processamento', 'bruto')
        record.set('metadados_adicionais', {
          search_id: searchId,
          abstract: item.abstract,
          tipo_ato: item.tipo_ato,
          orgao_principal: item.orgao_principal,
          organizacao_subordinada: item.organizacao_subordinada,
          timestamp: new Date().toISOString(),
          fonte_utilizada: sourceUsed,
          termo_buscado: termStr,
        })
        $app.save(record)

        const ocorrencia = new Record($app.findCollectionByNameOrId('ocorrencias_dou'))
        ocorrencia.set('publicacao_id', record.id)
        ocorrencia.set('termo_id', t.id)
        ocorrencia.set('trecho_encontrado', item.abstract || cleanText.substring(0, 200))
        ocorrencia.set('data_deteccao', new Date().toISOString().replace('T', ' ').substring(0, 19))
        ocorrencia.set('status_alerta', 'pendente')
        $app.save(ocorrencia)

        savedCount++
      }

      // DataJud Term Search
      let datajudCount = 0
      if (datajudApiKey && monitoredTribunals.length > 0) {
        for (let trAlias of monitoredTribunals) {
          try {
            const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${trAlias}/_search`
            const res = $http.send({
              url: url,
              method: 'POST',
              headers: {
                Authorization: 'APIKey ' + datajudApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                size: 10,
                query: { match_phrase: { 'partes.nome': termStr } },
              }),
              timeout: 10,
            })

            if (res.statusCode === 200 && res.json && res.json.hits && res.json.hits.hits) {
              for (let hit of res.json.hits.hits) {
                const proc = hit._source
                if (proc && proc.numeroProcesso) {
                  datajudCount++
                  for (let u of users) {
                    const n = new Record(notifsCol)
                    n.set('type', 'discovery')
                    n.set(
                      'update_content',
                      `Novo processo encontrado via termo '${termStr}': ${proc.numeroProcesso}`,
                    )
                    n.set('user', u.id)
                    n.set('is_read', false)
                    n.set('discovered_data', {
                      number: proc.numeroProcesso,
                      court: trAlias,
                      parties: termStr,
                      status: 'Descoberto',
                    })
                    try {
                      $app.saveNoValidate(n)
                    } catch (e) {}
                  }
                }
              }
            }
          } catch (e) {}
        }
      }

      logProcess(
        'Monitoramento Unificado',
        'Sucesso',
        `Busca para "${termStr}" finalizada (Fonte: ${sourceUsed}). Salvas ${savedCount} publicações e ${datajudCount} processos.`,
      )
    }
  } catch (e) {
    console.error('[Monitoring] Error in ingestion cron:', e)
    try {
      const logs = $app.findCollectionByNameOrId('logs_processamento')
      const logRec = new Record(logs)
      logRec.set('etapa', 'Monitoramento Unificado')
      logRec.set('status', 'Erro')
      logRec.set('mensagem', String(e))
      logRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
      $app.save(logRec)
    } catch (_) {}
  }
})
