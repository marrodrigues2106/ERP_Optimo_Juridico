routerAdd(
  'GET',
  '/backend/v1/pje-comunica/search',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.unauthorizedError('Usuário não autenticado.')
    }

    const role = auth.getString('role')
    const isAdmin = auth.getBool('isAdmin')
    const validRoles = [
      'admin',
      'legal_team',
      'manager',
      'coordinator',
      'collaborator',
      'admin_user',
    ]

    if (!isAdmin && !validRoles.includes(role)) {
      return e.forbiddenError('Seu perfil não tem permissão para realizar esta busca.')
    }

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
      let val = q.get(k)
      if (val) {
        if (k === 'numeroProcesso') {
          val = val.replace(/\D/g, '')
        }
        queryString += `${encodeURIComponent(k)}=${encodeURIComponent(val)}&`
      }
    })

    const fullUrl = queryString ? url + '?' + queryString : url

    const headers = {
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }

    const apiKey = $secrets.get('COMUNICA_PJE_KEY')
    if (apiKey) {
      headers['Authorization'] =
        apiKey.startsWith('Bearer') || apiKey.startsWith('APIKey') ? apiKey : `Bearer ${apiKey}`
    }

    try {
      const res = $http.send({
        url: fullUrl,
        method: 'GET',
        headers: headers,
        timeout: 30,
      })

      if (res.statusCode !== 200) {
        $app
          .logger()
          .error(
            'PJe Search Error',
            'status',
            res.statusCode,
            'body',
            JSON.stringify(res.json || {}),
          )
        return e.badRequestError(
          'Serviço do PJe indisponível ou retornou erro. Verifique os parâmetros e tente novamente.',
        )
      }

      return e.json(res.statusCode, res.json || { items: [] })
    } catch (err) {
      $app.logger().error('PJe Search Exception', 'error', err.message || String(err))
      return e.badRequestError(
        'Não foi possível conectar ao serviço do PJe. Verifique sua conexão e tente novamente.',
      )
    }
  },
  $apis.requireAuth(),
)
