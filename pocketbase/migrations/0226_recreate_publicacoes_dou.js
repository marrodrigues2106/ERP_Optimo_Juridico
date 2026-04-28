migrate(
  (app) => {
    const collection = new Collection({
      name: 'publicacoes_dou',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'titulo', type: 'text' },
        { name: 'secao', type: 'text' },
        { name: 'orgao', type: 'text' },
        { name: 'texto_bruto', type: 'text' },
        { name: 'texto_normalizado', type: 'text' },
        { name: 'url_origem', type: 'url' },
        { name: 'hash_conteudo', type: 'text' },
        { name: 'fonte_coleta', type: 'text' },
        { name: 'data_publicacao', type: 'date' },
        { name: 'data_coleta', type: 'date' },
        { name: 'status_processamento', type: 'select', values: ['bruto', 'processado', 'erro'] },
        { name: 'editionNumber', type: 'text' },
        { name: 'numberPage', type: 'text' },
        { name: 'hierarchyStr', type: 'text' },
        { name: 'artType', type: 'text' },
        {
          name: 'organization',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('organizations').id,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_pub_dou_hash ON publicacoes_dou (hash_conteudo) WHERE hash_conteudo != ''",
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('publicacoes_dou')
    app.delete(collection)
  },
)
