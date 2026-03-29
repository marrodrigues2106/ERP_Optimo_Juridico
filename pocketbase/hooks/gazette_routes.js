routerAdd(
  'POST',
  '/backend/v1/gazettes/ingest',
  (e) => {
    const body = e.requestInfo().body || {}
    const orgao = body.orgao || 'DJSP'

    const gazettes = $app.findCollectionByNameOrId('gazettes')
    const record = new Record(gazettes)
    record.set('data_publicacao', new Date().toISOString())
    record.set('orgao_publicador', orgao)
    record.set('tipo_diario', 'Judicial')
    record.set('status_processamento', 'INDEXADO')
    $app.save(record)

    const pubs = $app.findCollectionByNameOrId('gazette_publications')
    const pub = new Record(pubs)
    pub.set('diario', record.id)
    pub.set('hash_conteudo', $security.md5(Math.random().toString() + Date.now().toString()))

    // Generate random data for demo
    const randomProcess = `00${Math.floor(Math.random() * 10000)}-${Math.floor(Math.random() * 99)}.202${Math.floor(Math.random() * 4)}.8.26.0100`
    const randomOab = `${Math.floor(Math.random() * 90000) + 10000}/SP`

    pub.set('numero_processo', [randomProcess])
    pub.set('partes', ['Cliente Teste S/A', 'Estado de São Paulo'])
    pub.set('advogados', ['Dr. Advogado Simulação'])
    pub.set('oabs', [randomOab])
    pub.set(
      'texto_normalizado',
      `Processo ${randomProcess}. Intimação da parte Cliente Teste S/A através de seu patrono Dr. Advogado Simulação (OAB ${randomOab}) para manifestação acerca dos cálculos apresentados pelo Estado de São Paulo no prazo de 15 dias.`,
    )
    pub.set('data_publicacao', new Date().toISOString())
    pub.set('orgao', orgao)

    $app.save(pub)

    return e.json(200, {
      success: true,
      message: 'Ingestão e normalização concluídas com sucesso.',
      gazetteId: record.id,
    })
  },
  $apis.requireAuth(),
)
