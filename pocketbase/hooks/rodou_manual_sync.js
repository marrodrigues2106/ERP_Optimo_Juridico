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

      // 1. Primary: Official IN API
      try {
        let page = 1
        let hasMore = true
        while (page <= 2 && hasMore) {
          const res = $http.send({
            url: `https://in.gov.br/api/search?q=${encodeURIComponent(searchTerm)}&dataInicio=${today}&dataFim=${today}&page=${page}`,
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
            sourceSuccess = true
            if (res.json.results.length < 20) hasMore = false
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
            sourceSuccess = true
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
        savedCount++
        totalSaved++
      }

      logProcess(
        'Orquestrador Ro-DOU (Manual)',
        'Sucesso',
        `Busca para "${termStr}" finalizada. Salvas ${savedCount} publicações.`,
      )
    }

    return e.json(200, { message: `Orquestração manual concluída. ${totalSaved} salvos.` })
  },
  $apis.requireAuth(),
)
