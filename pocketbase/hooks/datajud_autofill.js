routerAdd(
  'POST',
  '/backend/v1/datajud/autofill',
  (e) => {
    const body = e.requestInfo().body || {}
    let num = body.number || ''
    num = String(num).replace(/\D/g, '')

    if (num.length !== 20) {
      return e.json(400, { error: 'Número inválido' })
    }

    const j = num.substring(13, 14)
    const tr = num.substring(14, 16)

    let alias = ''
    if (j === '4') alias = 'trf' + parseInt(tr, 10)
    else if (j === '5') alias = parseInt(tr, 10) === 0 ? 'tst' : 'trt' + parseInt(tr, 10)
    else if (j === '8') {
      const tjMap = {
        '01': 'ac',
        '02': 'al',
        '03': 'ap',
        '04': 'am',
        '05': 'ba',
        '06': 'ce',
        '07': 'df',
        '08': 'es',
        '09': 'go',
        10: 'ma',
        11: 'mt',
        12: 'ms',
        13: 'mg',
        14: 'pa',
        15: 'pb',
        16: 'pr',
        17: 'pe',
        18: 'pi',
        19: 'rj',
        20: 'rn',
        21: 'rs',
        22: 'ro',
        23: 'rr',
        24: 'sc',
        25: 'se',
        26: 'sp',
        27: 'to',
      }
      alias = 'tj' + (tjMap[tr] || 'sp')
    } else {
      alias = 'tse'
    }

    const targetAlias = body.alias || alias
    let apiKey = $secrets.get('DATAJUD_API_KEY') || ''
    let configuredTribunals = []

    try {
      const config = $app.findFirstRecordByFilter('monitoring_configs', "id != ''")
      if (config) {
        if (!apiKey && config.get('apiKey')) {
          apiKey = config.get('apiKey')
        }
        configuredTribunals = config.get('tribunais') || []
      }
    } catch (_) {}

    if (configuredTribunals.length > 0 && !configuredTribunals.includes(targetAlias)) {
      return e.json(400, {
        success: false,
        error: `O tribunal '${targetAlias}' não está habilitado no Monitoramento. Acesse a aba Configurações de Monitoramento e ative-o para poder usar a busca do DataJud.`,
      })
    }

    const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${targetAlias}/_search`

    try {
      if (!apiKey) {
        return e.json(500, {
          error:
            'A Chave da API do DataJud não está configurada no servidor (Secrets) ou no banco de dados.',
        })
      }

      const res = $http.send({
        url: url,
        method: 'POST',
        headers: {
          Authorization: 'APIKey ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          size: 1,
          query: { term: { 'numeroProcesso.keyword': num } },
        }),
      })

      if (res.statusCode >= 400) {
        let msg = 'DataJud HTTP Error: ' + res.statusCode
        if (res.statusCode === 401 || res.statusCode === 403) {
          msg =
            'Erro de Permissão (403): Verifique as permissões da sua API Key no portal do CNJ. O acesso ao tribunal (' +
            targetAlias +
            ') foi negado.'
          try {
            if (res.json && res.json.error && res.json.error.root_cause) {
              const rc = res.json.error.root_cause[0]
              if (
                rc.reason &&
                rc.reason.includes('unauthorized') &&
                rc.reason.includes('indices:data/read/search')
              ) {
                msg = `A chave de API do DataJud não possui permissão de leitura para o tribunal selecionado (ex: ${targetAlias}). Verifique as permissões no portal do CNJ.`
              }
            }
          } catch (err) {}
          return e.json(403, { error: msg })
        }
        return e.json(res.statusCode, { error: msg })
      }

      const hits = res.json?.hits?.hits || []
      if (hits.length === 0) {
        return e.json(200, {
          success: false,
          message: 'Processo não encontrado no DataJud (alias: ' + targetAlias + ')',
          data: null,
        })
      }

      const source = hits[0]._source
      let partiesStr = ''
      if (source.polo) {
        const active = source.polo.find((p) => p.polo === 'ATIVO')
        const passive = source.polo.find((p) => p.polo === 'PASSIVO')
        const aName = active?.partes?.[0]?.nome || 'Autor'
        const pName = passive?.partes?.[0]?.nome || 'Réu'
        partiesStr = `${aName} x ${pName}`
      }

      let statusStr = source.classe?.nome || ''
      if (source.movimentos && source.movimentos.length > 0) {
        const sortedMovs = source.movimentos.sort((a, b) => {
          const tA = new Date(a.dataHora || 0).getTime()
          const tB = new Date(b.dataHora || 0).getTime()
          return tB - tA
        })
        statusStr = sortedMovs[0].nome || sortedMovs[0].descricao || statusStr
      }

      return e.json(200, {
        success: true,
        data: {
          court: source.tribunal?.nome || targetAlias,
          courtOrgan: source.orgaoJulgador?.nomeOrgao || source.orgaoJulgador?.nome || '',
          class: source.classe?.nome || '',
          subject: source.assuntos?.[0]?.nome || '',
          parties: partiesStr,
          alias: targetAlias,
          processType: source.formato?.nome || 'Digital',
          distributionDate: source.dataAjuizamento || source.dataHora || '',
          status: statusStr,
        },
      })
    } catch (err) {
      return e.json(500, { error: 'Falha de rede ou DNS' })
    }
  },
  $apis.requireAuth(),
)
