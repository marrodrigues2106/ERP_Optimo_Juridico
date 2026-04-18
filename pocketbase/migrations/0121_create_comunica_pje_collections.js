migrate(
  (app) => {
    const ensureCollection = (def) => {
      try {
        app.findCollectionByNameOrId(def.name)
      } catch (_) {
        const col = new Collection(def)
        app.save(col)
      }
    }

    ensureCollection({
      name: 'settings',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'key', type: 'text', required: true },
        { name: 'value', type: 'text', required: true },
      ],
    })

    ensureCollection({
      name: 'searches',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'term', type: 'text' },
        { name: 'search_type', type: 'text' },
        { name: 'status', type: 'text' },
        { name: 'business_status', type: 'text' },
        { name: 'results_count', type: 'number' },
        { name: 'message', type: 'text' },
        { name: 'start_date', type: 'text' },
        { name: 'end_date', type: 'text' },
      ],
    })

    try {
      app.findCollectionByNameOrId('results')
    } catch (_) {
      const searchesCol = app.findCollectionByNameOrId('searches')
      const col = new Collection({
        name: 'results',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'search_id',
            type: 'relation',
            collectionId: searchesCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'sigla_tribunal', type: 'text' },
          { name: 'tipo_comunicacao', type: 'text' },
          { name: 'nome_orgao', type: 'text' },
          { name: 'texto', type: 'text' },
          { name: 'numero_processo', type: 'text' },
          { name: 'meio', type: 'text' },
          { name: 'tipo_documento', type: 'text' },
          { name: 'nome_classe', type: 'text' },
          { name: 'data_disponibilizacao', type: 'text' },
          { name: 'numero_comunicacao', type: 'text' },
          { name: 'link', type: 'text' },
          { name: 'hash_comunicacao', type: 'text' },
          { name: 'status_comunicacao', type: 'text' },
          { name: 'raw_json', type: 'json' },
        ],
      })
      app.save(col)
    }
  },
  (app) => {},
)
