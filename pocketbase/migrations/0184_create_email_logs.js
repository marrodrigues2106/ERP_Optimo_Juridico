migrate(
  (app) => {
    const collection = new Collection({
      name: 'email_logs',
      type: 'base',
      listRule: "@request.auth.id != '' && organization = @request.auth.active_organization",
      viewRule: "@request.auth.id != '' && organization = @request.auth.active_organization",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'organization',
          type: 'relation',
          required: false,
          collectionId: app.findCollectionByNameOrId('organizations').id,
          maxSelect: 1,
        },
        {
          name: 'user',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'sent_at', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('email_logs')
    app.delete(collection)
  },
)
