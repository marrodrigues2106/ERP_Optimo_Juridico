migrate(
  (app) => {
    if (!app.hasTable('audit_logs')) {
      const collection = new Collection({
        name: 'audit_logs',
        type: 'base',
        listRule: "@request.auth.role = 'admin' || @request.auth.isAdmin = true",
        viewRule: "@request.auth.role = 'admin' || @request.auth.isAdmin = true",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'collection_name', type: 'text', required: true },
          { name: 'record_id', type: 'text', required: true },
          { name: 'action', type: 'text', required: true },
          {
            name: 'user',
            type: 'relation',
            required: false,
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          { name: 'changes', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(collection)
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('audit_logs')
      app.delete(collection)
    } catch (e) {}
  },
)
