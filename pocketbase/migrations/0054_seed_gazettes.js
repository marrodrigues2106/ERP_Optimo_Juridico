migrate(
  (app) => {
    const gazettes = app.findCollectionByNameOrId('gazettes')
    const record1 = new Record(gazettes)
    record1.set('data_publicacao', new Date().toISOString())
    record1.set('orgao_publicador', 'TRF-3')
    record1.set('tipo_diario', 'Judicial')
    record1.set('status_processamento', 'INDEXADO')
    app.save(record1)

    const pubs = app.findCollectionByNameOrId('gazette_publications')
    const pub1 = new Record(pubs)
    pub1.set('diario', record1.id)
    pub1.set('hash_conteudo', 'hash_seed_1_abc')
    pub1.set('numero_processo', ['5001234-56.2023.4.03.6100'])
    pub1.set('partes', ['Moraes Rodrigues Advocacia', 'União Federal'])
    pub1.set('advogados', ['João Rodrigues'])
    pub1.set('oabs', ['12345/SP'])
    pub1.set(
      'texto_normalizado',
      'PROCESSO: 5001234-56.2023.4.03.6100. INTIMAÇÃO. Fica o advogado João Rodrigues (OAB 12345/SP) intimado acerca da decisão favorável à parte Moraes Rodrigues Advocacia no que tange aos pedidos formulados contra a União Federal.',
    )
    pub1.set('data_publicacao', new Date().toISOString())
    pub1.set('orgao', 'TRF-3')
    app.save(pub1)
  },
  (app) => {
    // Not strictly necessary to revert seed data
  },
)
