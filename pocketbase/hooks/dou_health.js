routerAdd(
  'GET',
  '/backend/v1/dou/health',
  (e) => {
    try {
      const res = $http.send({
        url: 'https://www.in.gov.br/consulta/-/buscar/dou',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10,
      })
      if (res.statusCode >= 200 && res.statusCode < 400) {
        return e.json(200, { status: 'up', message: 'Conexão com DOU ativa' })
      }
      return e.json(200, { status: 'down', message: `Erro HTTP: ${res.statusCode}` })
    } catch (err) {
      return e.json(200, { status: 'down', message: String(err) })
    }
  },
  $apis.requireAuth(),
)
