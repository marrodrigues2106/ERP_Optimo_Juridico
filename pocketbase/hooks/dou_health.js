routerAdd(
  'GET',
  '/backend/v1/dou/health',
  (e) => {
    let statusCode = 500
    let status = 'down'
    let message = 'Erro desconhecido'

    try {
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
      ]
      const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)]

      const res = $http.send({
        url: 'https://www.in.gov.br/consulta/-/buscar/dou',
        method: 'GET',
        headers: {
          'User-Agent': randomUA,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          Referer: 'https://www.in.gov.br/consulta/-/buscar/dou',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 10,
      })

      statusCode = res.statusCode
      if (statusCode >= 200 && statusCode < 400) {
        status = 'up'
        message = 'Conexão com DOU ativa'
      } else if (statusCode === 403 || statusCode === 429) {
        status = 'blocked'
        message = 'Acesso bloqueado pelo portal DOU (403/429) - Possível bloqueio de segurança.'
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
