migrate(
  (app) => {
    if (app.hasTable('ocorrencias_dou')) return

    const collection = new Collection({
      name: 'ocorrencias_dou',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'status_alerta', type: 'text', required: false },
        { name: 'is_archived', type: 'bool', required: false },
        { name: 'trecho_encontrado', type: 'text', required: false },
        { name: 'data_deteccao', type: 'text', required: false },
        { name: 'organization', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_ocorrencias_status ON ocorrencias_dou (status_alerta)',
        'CREATE INDEX idx_ocorrencias_archived ON ocorrencias_dou (is_archived)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('ocorrencias_dou')
      app.delete(collection)
    } catch (_) {}
  },
)
