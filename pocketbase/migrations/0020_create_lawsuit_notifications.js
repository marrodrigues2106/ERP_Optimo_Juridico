migrate(
  (app) => {
    if (!app.hasTable('lawsuit_notifications')) {
      const lawsuits = app.findCollectionByNameOrId('lawsuits')
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      const collection = new Collection({
        name: 'lawsuit_notifications',
        type: 'base',
        listRule: "@request.auth.id != '' && user = @request.auth.id",
        viewRule: "@request.auth.id != '' && user = @request.auth.id",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != '' && user = @request.auth.id",
        deleteRule: "@request.auth.id != '' && user = @request.auth.id",
        fields: [
          {
            name: 'lawsuit',
            type: 'relation',
            collectionId: lawsuits.id,
            maxSelect: 1,
            required: true,
          },
          { name: 'update_content', type: 'text', required: true },
          { name: 'is_read', type: 'bool' },
          {
            name: 'user',
            type: 'relation',
            collectionId: users.id,
            maxSelect: 1,
            required: true,
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
      const collection = app.findCollectionByNameOrId('lawsuit_notifications')
      app.delete(collection)
    } catch (e) {}
  },
)
