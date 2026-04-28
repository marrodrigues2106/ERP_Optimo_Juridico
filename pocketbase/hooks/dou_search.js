routerAdd(
  'POST',
  '/backend/v1/dou/search',
  (e) => {
    const body = e.requestInfo().body || {}
    const q = (body.q || '').trim()
    const publishFrom = body.publishFrom || ''
    const publishTo = body.publishTo || ''

    if (!q) {
      return e.badRequestError("Parâmetro 'q' é obrigatório.")
    }

    function logAction(msg, details) {
      try {
        const col = $app.findCollectionByNameOrId('logs_processamento')
        const r = new Record(col)
        r.set('mensagem', msg)
        r.set('detalhes', JSON.stringify(details))
        $app.saveNoValidate(r)
      } catch (err) {
        try {
          const sysCol = $app.findCollectionByNameOrId('system_logs')
          const sysR = new Record(sysCol)
          sysR.set('level', 'info')
          sysR.set('module', 'dou_search')
          sysR.set('message', msg)
          sysR.set('details', details)
          $app.saveNoValidate(sysR)
        } catch (err2) {}
      }
    }

    logAction('Iniciando busca DOU', { q, publishFrom, publishTo })

    let localResults = []
    try {
      const filters = [`texto_normalizado ~ {:q}`]
      const bindParams = { q: q }
      if (publishFrom) {
        filters.push(`data_publicacao >= {:from}`)
        bindParams.from = publishFrom
      }
      if (publishTo) {
        filters.push(`data_publicacao <= {:to}`)
        bindParams.to = publishTo
      }

      const records = $app.findRecordsByFilter(
        'publicacoes_dou',
        filters.join(' && '),
        '-data_publicacao',
        50,
        0,
        bindParams,
      )
      localResults = records.map((r) => ({
        id: r.id,
        titulo: r.getString('titulo'),
        secao: r.getString('secao'),
        orgao: r.getString('orgao'),
        texto_normalizado: r.getString('texto_normalizado'),
        url_origem: r.getString('url_origem'),
        data_publicacao: r.getString('data_publicacao'),
        fonte_coleta: 'Local',
      }))
    } catch (err) {
      console.log('Erro busca local', err)
    }

    if (localResults.length > 0) {
      logAction('Resultados encontrados no banco local', { count: localResults.length })
      return e.json(200, { source: 'local', items: localResults })
    }

    let scrapedItems = []
    let scrapingSuccess = false
    try {
      logAction('Iniciando scraping no IN', { q })

      const params = new URLSearchParams()
      params.append('q', q)
      params.append('s', 'todos')
      params.append('exactDate', 'personalizado')
      params.append('sortType', '0')
      if (publishFrom) {
        const parts = publishFrom.split(' ')[0].split('-')
        if (parts.length === 3) {
          params.append('publishFrom', `${parts[2]}/${parts[1]}/${parts[0]}`)
        } else {
          params.append('publishFrom', publishFrom)
        }
      }
      if (publishTo) {
        const parts = publishTo.split(' ')[0].split('-')
        if (parts.length === 3) {
          params.append('publishTo', `${parts[2]}/${parts[1]}/${parts[0]}`)
        } else {
          params.append('publishTo', publishTo)
        }
      }

      const inUrl = `https://www.in.gov.br/consulta/-/buscar/dou?${params.toString()}`
      const res = $http.send({
        url: inUrl,
        method: 'GET',
        timeout: 30,
      })

      if (res.statusCode === 200) {
        const html = new TextDecoder().decode(res.body)
        const match =
          html.match(/"jsonArray":\s*(\[.*?\])\s*,\s*"q"/s) ||
          html.match(/"jsonArray":\s*(\[.*?\])\s*\}/s)

        if (match && match[1]) {
          const jsonArray = JSON.parse(match[1])
          scrapingSuccess = true

          const col = $app.findCollectionByNameOrId('publicacoes_dou')
          const orgId = e.auth?.getString('active_organization') || ''

          for (const item of jsonArray) {
            const title = item.title || ''
            const url = item.urlTitle ? `https://www.in.gov.br/web/dou/-/${item.urlTitle}` : ''
            const pubDate = item.pubDate || ''
            const content = item.abstractContent || item.content || ''
            const hashInput = title + url + pubDate + content
            const hash = $security.md5(hashInput)

            let parsedDate = ''
            if (pubDate) {
              const dParts = pubDate.split('/')
              if (dParts.length === 3) {
                parsedDate = `${dParts[2]}-${dParts[1]}-${dParts[0]} 00:00:00.000Z`
              }
            }

            const scrapedItem = {
              titulo: title,
              secao: item.secaoDoDiario || '',
              orgao: item.hierarchyStr || '',
              texto_bruto: content,
              texto_normalizado: content,
              url_origem: url,
              hash_conteudo: hash,
              fonte_coleta: 'IN_Scraping',
              data_publicacao: parsedDate,
              data_coleta: new Date().toISOString().replace('T', ' '),
              status_processamento: 'processado',
              editionNumber: item.editionNumber || '',
              numberPage: item.numberPage || '',
              hierarchyStr: item.hierarchyStr || '',
              artType: item.artType || '',
              organization: orgId,
            }

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
              try {
                const existing = $app.findFirstRecordByData(
                  'publicacoes_dou',
                  'hash_conteudo',
                  hash,
                )
                if (existing) {
                  scrapedItems.push({
                    id: existing.id,
                    titulo: existing.getString('titulo'),
                    secao: existing.getString('secao'),
                    orgao: existing.getString('orgao'),
                    texto_normalizado: existing.getString('texto_normalizado'),
                    url_origem: existing.getString('url_origem'),
                    data_publicacao: existing.getString('data_publicacao'),
                    fonte_coleta: 'Local',
                  })
                }
              } catch (findErr) {}
            }
          }
        }
      }
    } catch (err) {
      console.log('Erro scraping IN', err)
    }

    if (scrapingSuccess && scrapedItems.length > 0) {
      logAction('Scraping concluído com sucesso', { count: scrapedItems.length })
      return e.json(200, { source: 'scraping', items: scrapedItems })
    }

    let qdItems = []
    try {
      logAction('Iniciando fallback Querido Diário', { q })
      const qdUrl = `https://queridodiario.ok.org.br/api/gazettes?querystring=${encodeURIComponent(q)}`
      const res = $http.send({
        url: qdUrl,
        method: 'GET',
        timeout: 30,
      })
      if (res.statusCode === 200) {
        const data = res.json
        if (data && data.gazettes) {
          const col = $app.findCollectionByNameOrId('publicacoes_dou')
          const orgId = e.auth?.getString('active_organization') || ''

          for (const item of data.gazettes) {
            const title = `Diário de ${item.territory_name}`
            const url = item.url || ''
            const content = item.excerpts ? item.excerpts.join('\n') : ''
            const pubDate = item.date ? `${item.date} 00:00:00.000Z` : ''

            const hashInput = title + url + pubDate + content
            const hash = $security.md5(hashInput)

            const qdItem = {
              titulo: title,
              secao: '',
              orgao: item.territory_name || '',
              texto_bruto: content,
              texto_normalizado: content,
              url_origem: url,
              hash_conteudo: hash,
              fonte_coleta: 'Querido_Diario',
              data_publicacao: pubDate,
              data_coleta: new Date().toISOString().replace('T', ' '),
              status_processamento: 'processado',
              organization: orgId,
            }

            try {
              const record = new Record(col)
              Object.keys(qdItem).forEach((k) => {
                if (qdItem[k]) record.set(k, qdItem[k])
              })
              $app.save(record)
              qdItems.push({
                id: record.id,
                ...qdItem,
              })
            } catch (saveErr) {
              try {
                const existing = $app.findFirstRecordByData(
                  'publicacoes_dou',
                  'hash_conteudo',
                  hash,
                )
                if (existing) {
                  qdItems.push({
                    id: existing.id,
                    titulo: existing.getString('titulo'),
                    secao: existing.getString('secao'),
                    orgao: existing.getString('orgao'),
                    texto_normalizado: existing.getString('texto_normalizado'),
                    url_origem: existing.getString('url_origem'),
                    data_publicacao: existing.getString('data_publicacao'),
                    fonte_coleta: 'Local',
                  })
                }
              } catch (findErr) {}
            }
          }
        }
      }
    } catch (err) {
      console.log('Erro fallback QD', err)
    }

    logAction('Busca finalizada', { count: qdItems.length, source: 'fallback' })
    return e.json(200, { source: 'fallback', items: qdItems })
  },
  $apis.requireAuth(),
)
