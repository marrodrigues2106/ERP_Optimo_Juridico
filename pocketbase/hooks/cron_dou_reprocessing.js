cronAdd('dou_reprocessing', '*/15 * * * *', () => {
  const queueCol = $app.findCollectionByNameOrId('dou_reprocessing_queue')
  const logsCol = $app.findCollectionByNameOrId('logs_processamento')
  const pubDouCol = $app.findCollectionByNameOrId('publicacoes_dou')

  try {
    const pending = $app.findRecordsByFilter(
      'dou_reprocessing_queue',
      "status = 'pending' || (status = 'failed' && retry_count < 3)",
      'updated',
      10,
      0,
    )

    for (const rec of pending) {
      rec.set('status', 'processing')
      $app.save(rec)

      const params = rec.get('params') || {}
      const q = params.q || ''
      let publishFrom = params.publishFrom || ''
      let publishTo = params.publishTo || ''

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
      let allScraped = []

      try {
        while (page <= 5 && hasMore) {
          let url = `https://www.in.gov.br/consulta/-/buscar/dou?q=${encodeURIComponent(q)}&s=do1,do2,do3,doextra&exactDate=personalizado&publishFrom=${fromDDMMYYYY}&publishTo=${toDDMMYYYY}&sortType=0&delta=20&currentPage=${page}&orgPrin=${encodeURIComponent(params.orgPrin || '')}`

          if (page > 1 && lastScore && lastId && lastDisplayDate) {
            url += `&newPage=${page}&score=${lastScore}&id=${lastId}&displayDate=${lastDisplayDate}`
          }

          const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15',
          ]
          const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)]

          const res = $http.send({
            url: url,
            method: 'GET',
            headers: {
              'User-Agent': randomUA,
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
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
                  allScraped = allScraped.concat(parsed.jsonArray)
                  lastScore = parsed.jsonArray[parsed.jsonArray.length - 1].score || ''
                  lastId = newLastId
                  lastDisplayDate = parsed.jsonArray[parsed.jsonArray.length - 1].pubDate || ''
                  if (parsed.jsonArray.length < 20) hasMore = false
                }
              } else {
                hasMore = false
              }
            } else {
              throw new Error('Structure Mismatch: Script tag not found')
            }
          } else {
            throw new Error(`HTTP ${res.statusCode}`)
          }
          page++
        }

        if (allScraped.length > 0) {
          for (const item of allScraped) {
                let cleanText = (item.content || '').replace(/<[^>]*>?/gm, '').trim()
                let pubDateStr = item.pubDate || fromDDMMYYYY
                if (pubDateStr.includes('/')) {
                  const parts = pubDateStr.split('/')
                  if (parts.length === 3) pubDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`
                }
                if (!pubDateStr.includes(':')) pubDateStr += ' 00:00:00'

                const urlTitle = item.urlTitle
                  ? `https://www.in.gov.br/web/dou/-/${item.urlTitle}`
                  : ''
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
                    record.set(
                      'data_coleta',
                      new Date().toISOString().replace('T', ' ').substring(0, 19),
                    )
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

                    $app.save(record)
                  } catch (saveErr) {}
                }
              }

          }

          rec.set('status', 'completed')
          rec.set('error_message', '')
          rec.set('last_attempt', new Date().toISOString().replace('T', ' ').substring(0, 19))
          $app.save(rec)
        } else {
          throw new Error('No array results from any page')
        }
      } catch (err) {
        rec.set('status', 'failed')
        rec.set('retry_count', rec.get('retry_count') + 1)
        rec.set('error_message', String(err))
        rec.set('last_attempt', new Date().toISOString().replace('T', ' ').substring(0, 19))
        $app.save(rec)

        try {
          const logRec = new Record(logsCol)
          logRec.set('etapa', 'Reprocessing Cron')
          logRec.set('status', 'Erro')
          logRec.set('mensagem', `Erro reprocessamento ${q}: ${String(err)}`)
          logRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
          $app.save(logRec)
        } catch (_) {}
      }
    }
  } catch (err) {
    console.error('Cron error', err)
  }
})
