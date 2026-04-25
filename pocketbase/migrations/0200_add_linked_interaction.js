migrate(
  (app) => {
    const tasks = app.findCollectionByNameOrId('tasks')
    tasks.fields.add(
      new RelationField({
        name: 'linked_interaction',
        type: 'relation',
        collectionId: app.findCollectionByNameOrId('crm_interactions').id,
        cascadeDelete: false,
        minSelect: null,
        maxSelect: 1,
        required: false,
        presentable: false,
        unique: false,
      }),
    )
    app.save(tasks)

    const events = app.findCollectionByNameOrId('agenda_events')
    events.fields.add(
      new RelationField({
        name: 'linked_interaction',
        type: 'relation',
        collectionId: app.findCollectionByNameOrId('crm_interactions').id,
        cascadeDelete: false,
        minSelect: null,
        maxSelect: 1,
        required: false,
        presentable: false,
        unique: false,
      }),
    )
    app.save(events)
  },
  (app) => {
    const tasks = app.findCollectionByNameOrId('tasks')
    tasks.fields.removeByName('linked_interaction')
    app.save(tasks)

    const events = app.findCollectionByNameOrId('agenda_events')
    events.fields.removeByName('linked_interaction')
    app.save(events)
  },
)
