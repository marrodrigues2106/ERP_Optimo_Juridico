routerAdd(
  'POST',
  '/backend/v1/rodou/sync',
  (e) => {
    const pubDou = $app.findCollectionByNameOrId('publicacoes_dou')
    const logs = $app.findCollectionByNameOrId('logs_processamento')

    const logProcess = (etapa, status, msg) => {
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

    const terms = $app.findRecordsByFilter('termos_monitorados', 'ativo = true', '', 100, 0)
    if (terms.length === 0) return e.json(200, { message: 'No active terms.' })

    const configs = $app.findRecordsByFilter('monitoring_configs', '', '', 1, 0)
    const config = configs.length > 0 ? configs[0] : null
    const douSections = config ? config.get('dou_sections') || '1,2,3,Extra' : '1,2,3,Extra'
    const territoryId = config ? config.get('territory_id') : ''
    const departmentIgnore = config ? config.get('department_ignore') : ''
    const ignoreSignature = config ? config.get('ignore_signature_match') : true
    const isExactSearch = config ? config.get('is_exact_search') : false

    const today = new Date().toISOString().split('T')[0]
    const todayDDMMYYYY = today.split('-').reverse().join('/')
    let totalSaved = 0

    for (let t of terms) {
      const termStr = t.get('termo')
      const searchTerm = isExactSearch ? `"${termStr}"` : termStr
      const searchId = logProcess(
        'Orquestrador Ro-DOU (Manual)',
        'Processando',
        `Iniciando busca para o termo: ${termStr}`,
      )

      let combinedResults = []
      let sourceSuccess = false
      let sourceUsed = ''

      // 1. Primary: Official IN API (DOU) Direct Scraping
      try {
        let page = 1
        let hasMore = true

        while (page <= 3 && hasMore) {
          const url = `https://www.in.gov.br/consulta/-/buscar/dou?q=${encodeURIComponent(searchTerm)}&s=do1,do2,do3,doextra&exactDate=personalizado&publishFrom=${todayDDMMYYYY}&publishTo=${todayDDMMYYYY}&sortType=0&delta=20&currentPage=${page}`
          const res = $http.send({
            url: url,
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            },
            timeout: 15,
          })

          if (res.statusCode === 200) {
            let html = ''
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
                      title: item.title || item.urlTitle || 'Publicação DOU',
                      section: item.artType || 'Seção 1',
                      department: item.hierarchyStr || 'DOU',
                      date: item.pubDate || todayDDMMYYYY,
                      abstract: item.content || '',
                      text: item.content || '',
                      url: item.urlTitle ? `https://www.in.gov.br/web/dou/-/${item.urlTitle}` : '',
                      tipo_ato: item.artType || '',
                      orgao_principal: item.hierarchyStr ? item.hierarchyStr.split('/')[0] : '',
                      organizacao_subordinada: item.hierarchyStr
                        ? item.hierarchyStr.split('/').slice(1).join('/')
                        : '',
                    })
                  })
                  sourceSuccess = true
                  sourceUsed = 'DOU_SCRAPING'
                  if (parsed.jsonArray.length < 20) hasMore = false
                } else {
                  sourceSuccess = true
                  sourceUsed = 'DOU_SCRAPING'
                  hasMore = false
                }
              } catch (e) {
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
      } catch (err) {}

      // 2. Secondary (Fallback): Querido Diário
      if (!sourceSuccess && territoryId) {
        try {
          const qdRes = $http.send({
            url: `https://queridodiario.ok.org.br/api/gazettes?querystring=${encodeURIComponent(searchTerm)}&published_since=${today}&territory_ids=${territoryId}&excerpt_size=400&number_of_excerpts=1`,
            method: 'GET',
            timeout: 10,
          })
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
          }
        } catch (err) {}
      }

      if (!sourceSuccess) {
        logProcess(
          'Orquestrador Ro-DOU (Manual)',
          'Fila de Reprocessamento',
          `Falha ao buscar termo: ${termStr}. Agendado para reprocessamento.`,
        )
        continue
      }

      let savedCount = 0
      for (let item of combinedResults) {
        if (
          departmentIgnore &&
          item.department.toLowerCase().includes(departmentIgnore.toLowerCase())
        )
          continue
        if (item.source === 'DOU') {
          const matchSec = douSections
            .split(',')
            .some((sec) => item.section.toLowerCase().includes(sec.trim().toLowerCase()))
          if (!matchSec) continue
        }

        const hash = $security.md5(item.title + item.url + item.date + item.source + item.text)
        try {
          $app.findFirstRecordByData('publicacoes_dou', 'hash_conteudo', hash)
          continue
        } catch (_) {}

        let cleanText = (item.text || '').replace(/<[^>]*>?/gm, '').trim()
        if (ignoreSignature) {
          cleanText = cleanText.replace(
            /Este documento pode ser verificado no endereço eletrônico.*/gi,
            '',
          )
        }

        let pubDate = item.date
        if (pubDate && pubDate.includes('/')) {
          const parts = pubDate.split('/')
          if (parts.length === 3) pubDate = `${parts[2]}-${parts[1]}-${parts[0]}`
        }
        if (!pubDate.includes(':')) pubDate = pubDate + ' 00:00:00'

        const record = new Record(pubDou)
        record.set('titulo', item.title)
        record.set('secao', item.section)
        record.set('orgao', item.department)
        record.set('texto_bruto', cleanText)
        record.set('texto_normalizado', cleanText.toLowerCase())
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
        savedCount++
        totalSaved++
      }

      logProcess(
        'Orquestrador Ro-DOU (Manual)',
        'Sucesso',
        `Busca para "${termStr}" finalizada (Fonte: ${sourceUsed}). Salvas ${savedCount} publicações.`,
      )
    }

    return e.json(200, { message: `Orquestração manual concluída. ${totalSaved} salvos.` })
  },
  $apis.requireAuth(),
)
