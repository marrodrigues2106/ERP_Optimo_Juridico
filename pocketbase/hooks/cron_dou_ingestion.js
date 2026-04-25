cronAdd('dou_ingestion', '0 8,20 * * *', () => {
  const logsCol = $app.findCollectionByNameOrId('system_logs')
  const startLog = new Record(logsCol)
  startLog.set('level', 'info')
  startLog.set('module', 'dou_ingestion')
  startLog.set('message', 'Iniciando ingestão DOU (8h/20h)')
  $app.save(startLog)

  try {
    const cases = $app.findRecordsByFilter(
      'legal_cases',
      "lifecycle_status = 'Ativo' && case_number != ''",
      '',
      2000,
      0,
    )
    cases.forEach((c) => {
      const num = (c.getString('case_number') || '').replace(/\D/g, '')
      if (num.length >= 10) {
        try {
          $app.findFirstRecordByData('termos_monitorados', 'termo', num)
        } catch (_) {
          const tCol = $app.findCollectionByNameOrId('termos_monitorados')
          const tr = new Record(tCol)
          tr.set('termo', num)
          tr.set('tipo_termo', 'Livre')
          tr.set('ativo', true)
          tr.set('observacoes', 'Gerado automaticamente do processo ' + c.getString('case_number'))
          if (c.get('responsible_collaborator')) {
            try {
              const collab = $app.findRecordById('collaborators', c.get('responsible_collaborator'))
              if (collab.get('user')) tr.set('usuario_id', collab.get('user'))
            } catch (e) {}
          }
          $app.save(tr)
        }
      }
    })

    const collabs = $app.findRecordsByFilter('collaborators', "oabNumber != ''", '', 1000, 0)
    collabs.forEach((c) => {
      const oab = c.getString('oabNumber')
      const uf = c.getString('oabSectional')
      if (oab) {
        const conjugated = uf ? `${oab}/${uf}` : oab
        try {
          $app.findFirstRecordByData('termos_monitorados', 'termo', conjugated)
        } catch (_) {
          const tCol = $app.findCollectionByNameOrId('termos_monitorados')
          const tr = new Record(tCol)
          tr.set('termo', conjugated)
          tr.set('tipo_termo', 'OAB')
          tr.set('ativo', true)
          tr.set('observacoes', 'Gerado automaticamente do colaborador ' + c.getString('name'))
          if (c.get('user')) tr.set('usuario_id', c.get('user'))
          $app.save(tr)
        }
      }
    })

    const today = new Date().toISOString().split('T')[0]
    const todayDDMMYYYY = today.split('-').reverse().join('/')

    const terms = $app.findRecordsByFilter('termos_monitorados', 'ativo = true', '', 1000, 0)
    let queriesToRun = new Set()
    terms.forEach((t) => {
      let q = t.getString('termo').trim()
      if (q) queriesToRun.add(q)
    })

    let successCount = 0

    for (const q of queriesToRun) {
      try {
        const qUrl = encodeURIComponent(`"${q}"`)
        const url = `https://www.in.gov.br/consulta/-/buscar/dou?q=${qUrl}&s=do1,do2,do3,doextra&exactDate=personalizado&publishFrom=${todayDDMMYYYY}&publishTo=${todayDDMMYYYY}&sortType=0&delta=20&currentPage=1`

        const res = $http.send({
          url: url,
          method: 'GET',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
          },
          timeout: 15,
        })

        if (res.statusCode === 200) {
          let html = ''
          if (typeof res.body === 'string') html = res.body
          else if (res.body) {
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

          const scriptMatch = html.match(
            new RegExp(
              '<scr' +
                'ipt[^>]*id="_br_com_seatecnologia_in_buscadou_BuscaDouPortlet_params"[^>]*>([\\s\\S]*?)<\\/scr' +
                'ipt>',
            ),
          )

          if (scriptMatch && scriptMatch[1]) {
            const parsed = JSON.parse(scriptMatch[1].trim())
            if (parsed.jsonArray && parsed.jsonArray.length > 0) {
              const pubCol = $app.findCollectionByNameOrId('publicacoes_dou')

              for (const item of parsed.jsonArray) {
                let cleanText = (item.content || '')
                  .replace(new RegExp('<[^>]*>?', 'gm'), '')
                  .trim()
                let cleanTitle = (item.title || item.artType || '')
                  .replace(new RegExp('<[^>]*>?', 'gm'), '')
                  .trim()

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

                const hash_conteudo = $security.md5(
                  normalizeText(cleanTitle) + normalizeText(cleanText) + (item.urlTitle || ''),
                )

                let inDb = false
                try {
                  $app.findFirstRecordByData('publicacoes_dou', 'hash_conteudo', hash_conteudo)
                  inDb = true
                } catch (_) {}

                if (!inDb) {
                  const pub = new Record(pubCol)
                  pub.set('data_publicacao', (item.pubDate || today) + 'T00:00:00.000Z')
                  pub.set('titulo', cleanTitle)
                  pub.set('texto_bruto', `${cleanTitle}\n\n${cleanText}`)
                  pub.set(
                    'url_origem',
                    item.urlTitle ? `https://www.in.gov.br/web/dou/-/${item.urlTitle}` : '',
                  )
                  pub.set('hash_conteudo', hash_conteudo)
                  pub.set('fonte_coleta', item.pubName || 'DOU')
                  pub.set('data_coleta', new Date().toISOString())
                  pub.set('status_processamento', 'bruto')
                  pub.set('artType', item.artType || 'Publicação')
                  pub.set('editionNumber', String(item.editionNumber || ''))
                  pub.set('numberPage', String(item.numberPage || ''))
                  pub.set('hierarchyStr', item.hierarchyStr || '')
                  if (item.hierarchyStr) {
                    const parts = item.hierarchyStr.split('-').map((p) => p.trim())
                    if (parts.length > 0) pub.set('orgao_principal', parts[0])
                    if (parts.length > 1)
                      pub.set('organizacao_subordinada', parts.slice(1).join(' - '))
                  }
                  $app.save(pub)
                  successCount++
                }
              }
            }
          }
        }

        let start = new Date().getTime()
        while (new Date().getTime() - start < 1000) {}
      } catch (err) {
        $app.logger().error('DOU item fetch error', 'query', q, 'error', err.message)
      }
    }

    const endLog = new Record(logsCol)
    endLog.set('level', 'info')
    endLog.set('module', 'dou_ingestion')
    endLog.set('message', `Ingestão DOU concluída. ${successCount} novas publicações ingeridas.`)
    $app.save(endLog)
  } catch (err) {
    const errorLog = new Record(logsCol)
    errorLog.set('level', 'error')
    errorLog.set('module', 'dou_ingestion')
    errorLog.set('message', 'Falha na ingestão DOU: ' + err.message)
    $app.save(errorLog)
  }
})
