routerAdd(
  'POST',
  '/backend/v1/monitoring/sync-terms',
  (e) => {
    const start = Date.now()
    try {
      const terms = $app.findRecordsByFilter('termos_monitorados', 'ativo = true', '', 100, 0)

      let newCount = 0
      let processesCount = 0

      const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
      const configRecord = configs.length > 0 ? configs[0] : null
      const datajudApiKey = configRecord ? configRecord.get('apiKey') : ''
      const inlabsKey = $secrets.get('INLABS') || ''
      const today = new Date().toISOString().split('T')[0]

      let users = []
      try {
        users = $app.findRecordsByFilter('users', '1=1', '', 100, 0)
      } catch (err) {}

      const pubDou = $app.findCollectionByNameOrId('publicacoes_dou')
      const notifsCol = $app.findCollectionByNameOrId('lawsuit_notifications')

      for (let t of terms) {
        const termStr = t.get('termo')

        // 1. INLABS (DOU)
        if (inlabsKey) {
          try {
            const inlabsRes = $http.send({
              url: `https://api.inlabs.com.br/v1/search?q=${encodeURIComponent(termStr)}&date=${today}`,
              method: 'GET',
              headers: { Authorization: `Bearer ${inlabsKey}` },
              timeout: 10,
            })
            if (inlabsRes.statusCode === 200 && inlabsRes.json?.results) {
              for (let item of inlabsRes.json.results) {
                const hash = $security.md5(item.title + item.url + item.date + 'INLABS' + item.text)
                try {
                  $app.findFirstRecordByData('publicacoes_dou', 'hash_conteudo', hash)
                } catch (_) {
                  const record = new Record(pubDou)
                  record.set('titulo', item.title)
                  record.set('secao', item.section || 'Geral')
                  record.set('orgao', item.department || 'INLABS')
                  record.set('texto_bruto', item.text || '')
                  record.set('url_origem', item.url || '')
                  record.set('hash_conteudo', hash)
                  record.set('fonte_coleta', 'INLABS')
                  record.set(
                    'data_publicacao',
                    item.date.includes(':') ? item.date : item.date + ' 00:00:00',
                  )
                  record.set(
                    'data_coleta',
                    new Date().toISOString().replace('T', ' ').substring(0, 19),
                  )
                  record.set('status_processamento', 'bruto')
                  $app.save(record)

                  const ocorrencia = new Record($app.findCollectionByNameOrId('ocorrencias_dou'))
                  ocorrencia.set('publicacao_id', record.id)
                  ocorrencia.set('termo_id', t.id)
                  ocorrencia.set('trecho_encontrado', item.abstract || item.title)
                  ocorrencia.set(
                    'data_deteccao',
                    new Date().toISOString().replace('T', ' ').substring(0, 19),
                  )
                  ocorrencia.set('status_alerta', 'pendente')
                  $app.save(ocorrencia)

                  newCount++
                }
              }
            }
          } catch (e) {}
        }

        // 2. DataJud
        if (datajudApiKey) {
          try {
            const url = `https://api-publica.datajud.cnj.jus.br/api_publica_tjrj/_search`
            let res = $http.send({
              url: url,
              method: 'POST',
              headers: {
                Authorization: 'APIKey ' + datajudApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                size: 2,
                query: { match_phrase: { 'partes.nome': termStr } },
              }),
              timeout: 10,
            })
            if (res.statusCode === 200 && res.json?.hits?.hits) {
              for (let hit of res.json.hits.hits) {
                if (hit._source && hit._source.numeroProcesso) {
                  processesCount++
                  for (let u of users) {
                    const n = new Record(notifsCol)
                    n.set('type', 'discovery')
                    n.set(
                      'update_content',
                      `Novo processo encontrado via termo '${termStr}': ${hit._source.numeroProcesso}`,
                    )
                    n.set('user', u.id)
                    n.set('is_read', false)
                    n.set('discovered_data', {
                      number: hit._source.numeroProcesso,
                      court: 'tjrj',
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

      if (configRecord) {
        configRecord.set('lastLatency', Date.now() - start)
        configRecord.set('lastStatus', 200)
        $app.saveNoValidate(configRecord)
      }

      const logsCol = $app.findCollectionByNameOrId('logs_processamento')
      const logRec = new Record(logsCol)
      logRec.set('etapa', 'Sincronização Manual de Termos')
      logRec.set('status', 'Sucesso')
      logRec.set(
        'mensagem',
        `Sincronização executada em ${Date.now() - start}ms. ${newCount} publicações e ${processesCount} processos encontrados.`,
      )
      logRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
      $app.save(logRec)

      return e.json(200, { success: true, publications: newCount, processes: processesCount })
    } catch (err) {
      return e.json(500, { error: String(err) })
    }
  },
  $apis.requireAuth(),
)
