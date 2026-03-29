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
    const apiKey = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
    const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${targetAlias}/_search`

    try {
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
        if (res.statusCode === 401 || res.statusCode === 403) {
          return e.json(401, { error: 'Authentication Error: Invalid API Key' })
        }
        return e.json(res.statusCode, { error: 'DataJud HTTP Error' })
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

      return e.json(200, {
        success: true,
        data: {
          court: source.orgaoJulgador?.nomeOrgao || '',
          class: source.classe?.nome || '',
          subject: source.assuntos?.[0]?.nome || '',
          parties: partiesStr,
          alias: targetAlias,
        },
      })
    } catch (err) {
      return e.json(500, { error: 'Falha de rede ou DNS' })
    }
  },
  $apis.requireAuth(),
)
