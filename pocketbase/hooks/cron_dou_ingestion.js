cronAdd('dou_ingestion_daily', '0 3 * * *', () => {
  console.log('[DOU] Starting daily automated ingestion...')
  try {
    const pubDou = $app.findCollectionByNameOrId('publicacoes_dou')
    const logs = $app.findCollectionByNameOrId('logs_processamento')

    const mockData = [
      {
        titulo: 'Portaria Nº 123/2026',
        secao: 'Seção 1',
        orgao: 'Ministério da Fazenda',
        texto_bruto:
          'Fica determinado que os processos tributários relacionados à Moraes Rodrigues Advocacia serão priorizados.',
        url_origem: 'https://www.in.gov.br/web/dou/-/portaria-123',
        hash_conteudo: $security.md5('Portaria Nº 123/2026_' + new Date().toISOString()),
      },
      {
        titulo: 'Aviso de Licitação',
        secao: 'Seção 3',
        orgao: 'Receita Federal',
        texto_bruto:
          'Aviso de licitação para contratação de serviços de planejamento patrimonial na região sul.',
        url_origem: 'https://www.in.gov.br/web/dou/-/aviso-licitacao',
        hash_conteudo: $security.md5('Aviso de Licitação_' + new Date().toISOString()),
      },
    ]

    mockData.forEach((item) => {
      try {
        $app.findFirstRecordByData('publicacoes_dou', 'hash_conteudo', item.hash_conteudo)
      } catch (_) {
        const record = new Record(pubDou)
        record.set('titulo', item.titulo)
        record.set('secao', item.secao)
        record.set('orgao', item.orgao)
        record.set('texto_bruto', item.texto_bruto)
        record.set('url_origem', item.url_origem)
        record.set('hash_conteudo', item.hash_conteudo)
        record.set('data_publicacao', new Date().toISOString().replace('T', ' ').substring(0, 19))
        record.set('data_coleta', new Date().toISOString().replace('T', ' ').substring(0, 19))
        record.set('status_processamento', 'bruto')
        record.set('fonte_coleta', 'DOU-Scraper-Mock')

        $app.save(record)

        const logRec = new Record(logs)
        logRec.set('publicacao_id', record.id)
        logRec.set('etapa', 'Coleta')
        logRec.set('status', 'Sucesso')
        logRec.set('mensagem', 'Publicação coletada com sucesso do DOU.')
        logRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
        $app.save(logRec)
      }
    })
  } catch (e) {
    console.error('[DOU] Error in ingestion cron:', e)
  }
})
