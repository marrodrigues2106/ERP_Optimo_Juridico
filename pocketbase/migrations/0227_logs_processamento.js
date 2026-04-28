migrate(
  (app) => {
    try {
      const existing = app.findCollectionByNameOrId('logs_processamento')
      if (!existing.fields.getByName('etapa')) existing.fields.add(new TextField({ name: 'etapa' }))
      if (!existing.fields.getByName('status'))
        existing.fields.add(new TextField({ name: 'status' }))
      if (!existing.fields.getByName('mensagem'))
        existing.fields.add(new TextField({ name: 'mensagem' }))
      if (!existing.fields.getByName('data_hora'))
        existing.fields.add(new DateField({ name: 'data_hora' }))
      if (!existing.fields.getByName('metadados'))
        existing.fields.add(new JSONField({ name: 'metadados' }))
      app.save(existing)
    } catch (_) {
      const collection = new Collection({
        name: 'logs_processamento',
        type: 'base',
        listRule: "@request.auth.role = 'admin' || @request.auth.isAdmin = true",
        viewRule: "@request.auth.role = 'admin' || @request.auth.isAdmin = true",
        createRule: "@request.auth.id != ''",
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'etapa', type: 'text' },
          { name: 'status', type: 'text' },
          { name: 'mensagem', type: 'text' },
          { name: 'data_hora', type: 'date' },
          { name: 'metadados', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(collection)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('logs_processamento')
      app.delete(col)
    } catch (_) {}
  },
)
