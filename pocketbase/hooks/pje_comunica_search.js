routerAdd(
  'GET',
  '/backend/v1/pje-comunica/search',
  (e) => {
    const url = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao'
    const q = e.request.url.query()
    let queryString = ''

    const keys = [
      'numeroOab',
      'ufOab',
      'nomeParte',
      'numeroProcesso',
      'dataDisponibilizacaoInicio',
      'dataDisponibilizacaoFim',
      'siglaTribunal',
      'numeroComunicacao',
      'nomeAdvogado',
      'meio',
    ]

    keys.forEach((k) => {
      const val = q.get(k)
      if (val) {
        queryString += `${encodeURIComponent(k)}=${encodeURIComponent(val)}&`
      }
    })

    const fullUrl = queryString ? url + '?' + queryString : url

    const res = $http.send({
      url: fullUrl,
      method: 'GET',
      headers: { Accept: 'application/json' },
      timeout: 30,
    })

    return e.json(res.statusCode, res.json || { items: [] })
  },
  $apis.requireAuth(),
)
