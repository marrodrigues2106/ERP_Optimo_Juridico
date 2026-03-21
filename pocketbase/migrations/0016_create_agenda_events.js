migrate(
  (app) => {
    if (!app.hasTable('agenda_events')) {
      const lawsuits = app.findCollectionByNameOrId('lawsuits')
      const collection = new Collection({
        name: 'agenda_events',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'description', type: 'text' },
          {
            name: 'type',
            type: 'select',
            values: ['Note', 'Meeting', 'Call', 'Deadline', 'Reminder'],
            maxSelect: 1,
          },
          { name: 'start_date', type: 'date' },
          { name: 'end_date', type: 'date' },
          { name: 'reminders', type: 'bool' },
          { name: 'linked_lawsuit', type: 'relation', collectionId: lawsuits.id, maxSelect: 1 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(collection)
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('agenda_events')
      app.delete(collection)
    } catch (e) {}
  },
)
