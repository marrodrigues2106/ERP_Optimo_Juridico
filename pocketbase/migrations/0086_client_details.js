migrate(
  (app) => {
    const orgId = app.findCollectionByNameOrId('organizations').id
    const clientId = app.findCollectionByNameOrId('clients').id

    const docs = new Collection({
      name: 'client_documents',
      type: 'base',
      listRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      viewRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      createRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      updateRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      deleteRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      fields: [
        { name: 'client', type: 'relation', required: true, collectionId: clientId, maxSelect: 1 },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['RG', 'CPF', 'CNH', 'Passport', 'Other'],
        },
        { name: 'document_number', type: 'text' },
        { name: 'issue_date', type: 'date' },
        { name: 'expiry_date', type: 'date' },
        { name: 'issuing_body', type: 'text' },
        { name: 'file', type: 'file', maxSelect: 1, maxSize: 52428800 },
        { name: 'organization', type: 'relation', collectionId: orgId, maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(docs)

    const tasks = app.findCollectionByNameOrId('tasks')
    tasks.fields.add(
      new RelationField({
        name: 'client',
        type: 'relation',
        collectionId: clientId,
        maxSelect: 1,
      }),
    )
    app.save(tasks)
  },
  (app) => {
    try {
      const docs = app.findCollectionByNameOrId('client_documents')
      app.delete(docs)
    } catch (_) {}

    try {
      const tasks = app.findCollectionByNameOrId('tasks')
      const field = tasks.fields.getByName('client')
      if (field) {
        tasks.fields.removeByName('client')
        app.save(tasks)
      }
    } catch (_) {}
  },
)
