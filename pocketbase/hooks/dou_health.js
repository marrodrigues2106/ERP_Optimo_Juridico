routerAdd(
  'GET',
  '/backend/v1/dou/health',
  (e) => {
    let statusCode = 500
    let status = 'down'
    let message = 'Erro desconhecido'

    try {
      const res = $http.send({
        url: 'https://www.in.gov.br/consulta/-/buscar/dou',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10,
      })

      statusCode = res.statusCode
      if (statusCode >= 200 && statusCode < 400) {
        status = 'up'
        message = 'Conexão com DOU ativa'
      } else if (statusCode === 403) {
        status = 'blocked'
        message =
          'Acesso bloqueado pelo portal DOU (403 Forbidden) - Possível bloqueio de segurança.'
      } else {
        status = 'down'
        message = `Erro HTTP: ${statusCode}`
      }
    } catch (err) {
      status = 'down'
      message = String(err)
    }

    try {
      const configs = $app.findRecordsByFilter('monitoring_configs', '1=1', '', 1, 0)
      if (configs && configs.length > 0) {
        const config = configs[0]
        config.set('douStatus', statusCode)
        config.set('douError', status === 'up' ? '' : message)
        $app.save(config)
      }
    } catch (err) {
      // ignore
    }

    if (status === 'blocked') {
      try {
        const logCol = $app.findCollectionByNameOrId('logs_processamento')
        const logRecord = new Record(logCol)
        logRecord.set('etapa', 'Health Check DOU')
        logRecord.set('status', 'Bloqueado')
        logRecord.set('mensagem', message)
        logRecord.set('data_hora', new Date().toISOString())
        $app.save(logRecord)
      } catch (err) {
        // ignore
      }
    }

    return e.json(200, { status, message, statusCode })
  },
  $apis.requireAuth(),
)
