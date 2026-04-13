migrate(
  (app) => {
    const collection = new Collection({
      name: 'logs_processamento',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'publicacao_id',
          type: 'relation',
          required: false,
          collectionId: app.findCollectionByNameOrId('publicacoes_dou').id,
          maxSelect: 1,
        },
        { name: 'etapa', type: 'text', required: false },
        { name: 'status', type: 'text', required: false },
        { name: 'mensagem', type: 'text', required: false },
        { name: 'data_hora', type: 'date', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('logs_processamento')
      app.delete(collection)
    } catch (_) {}
  },
)
