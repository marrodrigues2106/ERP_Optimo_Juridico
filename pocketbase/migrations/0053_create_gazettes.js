migrate(
  (app) => {
    const gazettes = new Collection({
      name: 'gazettes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'data_publicacao', type: 'date' },
        { name: 'orgao_publicador', type: 'text' },
        { name: 'tipo_diario', type: 'text' },
        { name: 'url_original', type: 'url' },
        { name: 'nome_arquivo', type: 'text' },
        { name: 'texto_bruto_completo', type: 'text' },
        {
          name: 'status_processamento',
          type: 'select',
          values: ['COLETADO', 'EXTRAIDO', 'NORMALIZADO', 'INDEXADO', 'ERRO'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_gazettes_data ON gazettes (data_publicacao)'],
    })
    app.save(gazettes)

    const pubs = new Collection({
      name: 'gazette_publications',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'diario',
          type: 'relation',
          collectionId: gazettes.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'hash_conteudo', type: 'text', required: true },
        { name: 'numero_processo', type: 'json' },
        { name: 'partes', type: 'json' },
        { name: 'advogados', type: 'json' },
        { name: 'oabs', type: 'json' },
        { name: 'cpfs_cnpjs', type: 'json' },
        { name: 'texto_normalizado', type: 'text' },
        { name: 'data_publicacao', type: 'date' },
        { name: 'orgao', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_gazette_pubs_hash ON gazette_publications (hash_conteudo)',
        'CREATE INDEX idx_gazette_pubs_data ON gazette_publications (data_publicacao)',
      ],
    })
    app.save(pubs)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('gazette_publications'))
    app.delete(app.findCollectionByNameOrId('gazettes'))
  },
)
