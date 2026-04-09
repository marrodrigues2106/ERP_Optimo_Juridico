cronAdd('dou_datajud_ingestion_daily', '0 3 * * *', () => {
  console.log('[Monitoring] Starting unified background term search...')

  const pubDou = $app.findCollectionByNameOrId('publicacoes_dou')
  const logs = $app.findCollectionByNameOrId('logs_processamento')
  const notifsCol = $app.findCollectionByNameOrId('lawsuit_notifications')

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

    let monitoredTribunals = ['tjrj'] // default fallback
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

    let users = []
    try {
      users = $app.findRecordsByFilter('users', '1=1', '', 100, 0)
    } catch (e) {}

    for (let t of terms) {
      const termStr = t.get('termo')
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

      // 1. Official IN API (DOU)
      try {
        const res = $http.send({
          url: `https://in.gov.br/api/search?q=${encodeURIComponent(termStr)}&dataInicio=${today}&dataFim=${today}&page=1`,
          method: 'GET',
          timeout: 10,
        })
        if (res.statusCode === 200 && res.json?.results) {
          combinedResults = combinedResults.concat(
            res.json.results.map((item) => ({
              source: 'DOU',
              title: item.title || 'Publicação DOU',
              section: item.section || 'Seção 1',
              department: item.agency || 'DOU',
              date: item.date || today,
              abstract: item.abstract || '',
              text: item.text || '',
              url: item.url || '',
            })),
          )
        }
      } catch (e) {}

      // 2. Querido Diário API
      if (territoryId) {
        try {
          const qdRes = $http.send({
            url: `https://queridodiario.ok.org.br/api/gazettes?querystring=${encodeURIComponent(termStr)}&published_since=${today}&territory_ids=${territoryId}&excerpt_size=400`,
            method: 'GET',
            timeout: 10,
          })
          if (qdRes.statusCode === 200 && qdRes.json?.gazettes) {
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
              })),
            )
          }
        } catch (e) {}
      }

      // 3. INLABS Connector
      try {
        const inlabsKey = $secrets.get('INLABS') || ''
        if (inlabsKey) {
          const inlabsRes = $http.send({
            url: `https://api.inlabs.com.br/v1/search?q=${encodeURIComponent(termStr)}&date=${today}`,
            method: 'GET',
            headers: { Authorization: `Bearer ${inlabsKey}` },
            timeout: 10,
          })
          if (inlabsRes.statusCode === 200 && inlabsRes.json?.results) {
            combinedResults = combinedResults.concat(
              inlabsRes.json.results.map((item) => ({
                source: 'INLABS',
                title: item.title || 'Publicação INLABS',
                section: item.section || 'Geral',
                department: item.department || 'INLABS',
                date: item.date || today,
                abstract: item.abstract || '',
                text: item.text || '',
                url: item.url || '',
              })),
            )
          }
        }
      } catch (e) {}

      // Filter and Save DOU Results
      let savedCount = 0
      for (let item of combinedResults) {
        const textLower = (item.text || '').toLowerCase()
        const hasIgnored = ignoredTerms.some((it) => it && textLower.includes(it))
        if (hasIgnored) continue

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

        const record = new Record(pubDou)
        record.set('titulo', item.title)
        record.set('secao', item.section)
        record.set('orgao', item.department)
        record.set('texto_bruto', cleanText)
        record.set('url_origem', item.url)
        record.set('hash_conteudo', hash)
        record.set('fonte_coleta', item.source)
        record.set('data_publicacao', item.date.includes(':') ? item.date : item.date + ' 00:00:00')
        record.set('data_coleta', new Date().toISOString().replace('T', ' ').substring(0, 19))
        record.set('status_processamento', 'bruto')
        record.set('metadados_adicionais', { search_id: searchId, abstract: item.abstract })
        $app.save(record)

        // Link to ocorrencias_dou
        const ocorrencia = new Record($app.findCollectionByNameOrId('ocorrencias_dou'))
        ocorrencia.set('publicacao_id', record.id)
        ocorrencia.set('termo_id', t.id)
        ocorrencia.set('trecho_encontrado', item.abstract || cleanText.substring(0, 200))
        ocorrencia.set('data_deteccao', new Date().toISOString().replace('T', ' ').substring(0, 19))
        ocorrencia.set('status_alerta', 'pendente')
        $app.save(ocorrencia)

        savedCount++
      }

      // 4. DataJud Term Search
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

            if (res.statusCode === 200 && res.json?.hits?.hits) {
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
        `Busca para "${termStr}" finalizada. Salvas ${savedCount} publicações e ${datajudCount} processos.`,
      )
    }
  } catch (e) {
    console.error('[Monitoring] Error in ingestion cron:', e)
    logProcess('Monitoramento Unificado', 'Erro', String(e))
  }
})
