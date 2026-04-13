migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('can_view_search_module')) {
      users.fields.add(new BoolField({ name: 'can_view_search_module' }))
      app.save(users)
    }

    const cache = new Collection({
      name: 'dou_search_cache',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'query_key', type: 'text', required: true },
        { name: 'payload', type: 'json', required: true },
        { name: 'expires_at', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_dou_search_cache_key ON dou_search_cache (query_key)'],
    })
    app.save(cache)

    const queue = new Collection({
      name: 'dou_reprocessing_queue',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'query_key', type: 'text', required: true },
        { name: 'params', type: 'json', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pending', 'processing', 'failed', 'completed'],
        },
        { name: 'retry_count', type: 'number', required: true },
        { name: 'error_message', type: 'text' },
        { name: 'last_attempt', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_dou_reproc_queue_key ON dou_reprocessing_queue (query_key)',
      ],
    })
    app.save(queue)

    // Set the can_view_search_module to true for admin users automatically
    app
      .db()
      .newQuery("UPDATE users SET can_view_search_module = 1 WHERE role = 'admin' OR isAdmin = 1")
      .execute()
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('can_view_search_module')
    app.save(users)

    try {
      const cache = app.findCollectionByNameOrId('dou_search_cache')
      app.delete(cache)
    } catch (_) {}

    try {
      const queue = app.findCollectionByNameOrId('dou_reprocessing_queue')
      app.delete(queue)
    } catch (_) {}
  },
)
