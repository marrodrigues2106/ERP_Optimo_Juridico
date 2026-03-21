migrate(
  (app) => {
    const collections = [
      {
        name: 'posts',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'category', type: 'text' },
          { name: 'content', type: 'text', required: true },
          { name: 'imageUrl', type: 'url' },
          { name: 'videoUrl', type: 'url' },
          { name: 'published', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      },
      {
        name: 'lawsuits',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'number', type: 'text', required: true },
          { name: 'court', type: 'text' },
          { name: 'parties', type: 'text' },
          { name: 'status', type: 'text' },
          { name: 'deadline', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      },
      {
        name: 'finances',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'description', type: 'text', required: true },
          { name: 'type', type: 'select', values: ['inflow', 'outflow'], required: true },
          { name: 'amount', type: 'number', required: true },
          { name: 'date', type: 'date', required: true },
          { name: 'status', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      },
      {
        name: 'knowledge_items',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'author', type: 'text' },
          { name: 'category', type: 'text' },
          { name: 'type', type: 'text' },
          { name: 'link', type: 'url' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      },
      {
        name: 'clients',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'email', type: 'email' },
          { name: 'phone', type: 'text' },
          { name: 'status', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      },
      {
        name: 'collaborators',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'role', type: 'select', values: ['Advogado', 'Associado', 'Administrativo'] },
          { name: 'email', type: 'email' },
          { name: 'phone', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      },
    ]

    for (const c of collections) {
      app.save(new Collection(c))
    }
  },
  (app) => {
    const names = ['posts', 'lawsuits', 'finances', 'knowledge_items', 'clients', 'collaborators']
    for (const name of names) {
      try {
        app.delete(app.findCollectionByNameOrId(name))
      } catch (_) {}
    }
  },
)
