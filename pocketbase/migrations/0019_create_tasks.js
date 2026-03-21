migrate(
  (app) => {
    if (!app.hasTable('tasks')) {
      const collaborators = app.findCollectionByNameOrId('collaborators')
      const collection = new Collection({
        name: 'tasks',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'description', type: 'text' },
          { name: 'due_date', type: 'date' },
          {
            name: 'priority',
            type: 'select',
            values: ['low', 'medium', 'high'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            values: ['todo', 'completed'],
            maxSelect: 1,
          },
          {
            name: 'collaborator',
            type: 'relation',
            collectionId: collaborators.id,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(collection)
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('tasks')
      app.delete(collection)
    } catch (e) {}
  },
)
