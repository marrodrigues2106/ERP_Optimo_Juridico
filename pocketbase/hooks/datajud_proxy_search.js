routerAdd(
  'POST',
  '/backend/v1/datajud/search',
  (e) => {
    const body = e.requestInfo().body
    const alias = body.alias
    const payload = body.payload

    if (!alias) {
      return e.badRequestError('Alias is required')
    }

    let apiKey = $secrets.get('DATAJUD_API_KEY') || ''
    if (!apiKey) {
      try {
        const config = $app.findFirstRecordByFilter('monitoring_configs', "id != ''")
        if (config && config.get('apiKey')) {
          apiKey = config.get('apiKey')
        }
      } catch (_) {}
    }

    if (!apiKey) {
      return e.internalServerError(
        'DATAJUD_API_KEY not configured. Something went wrong while processing your request.',
      )
    }

    const url = 'https://api-publica.datajud.cnj.jus.br/' + alias + '/_search'

    try {
      const res = $http.send({
        url: url,
        method: 'POST',
        headers: {
          Authorization: 'APIKey ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        timeout: 30,
      })

      if (res.statusCode >= 400) {
        return e.json(res.statusCode, res.json || { message: 'DataJud Error ' + res.statusCode })
      }

      return e.json(200, res.json || {})
    } catch (err) {
      return e.internalServerError(
        'Network error or something went wrong while processing your request: ' + err.message,
      )
    }
  },
  $apis.requireAuth(),
)
