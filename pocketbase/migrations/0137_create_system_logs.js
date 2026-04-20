migrate(
  (app) => {
    const collection = new Collection({
      name: 'system_logs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'level', type: 'select', required: true, values: ['info', 'warning', 'error'] },
        { name: 'module', type: 'text', required: true },
        { name: 'message', type: 'text', required: true },
        { name: 'details', type: 'json', required: false },
        {
          name: 'organization',
          type: 'relation',
          required: false,
          collectionId: app.findCollectionByNameOrId('organizations').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'user',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_system_logs_level ON system_logs (level)',
        'CREATE INDEX idx_system_logs_module ON system_logs (module)',
        'CREATE INDEX idx_system_logs_created ON system_logs (created)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('system_logs')
      app.delete(collection)
    } catch (e) {}
  },
)
