migrate(
  (app) => {
    const boards = new Collection({
      name: 'kanban_boards',
      type: 'base',
      listRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      viewRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      createRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      updateRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      deleteRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'visibility',
          type: 'select',
          values: ['Public', 'Team', 'Restricted'],
          maxSelect: 1,
        },
        {
          name: 'organization',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('organizations').id,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(boards)

    const cols = new Collection({
      name: 'kanban_columns',
      type: 'base',
      listRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      viewRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      createRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      updateRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      deleteRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'board', type: 'relation', collectionId: boards.id, maxSelect: 1 },
        { name: 'order_index', type: 'number' },
        {
          name: 'organization',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('organizations').id,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(cols)

    const tasks = app.findCollectionByNameOrId('tasks')
    tasks.fields.add(
      new RelationField({ name: 'kanban_column', collectionId: cols.id, maxSelect: 1 }),
    )
    tasks.fields.add(new BoolField({ name: 'is_recurring' }))
    tasks.fields.add(
      new SelectField({
        name: 'recurrence_type',
        values: ['daily', 'weekly', 'monthly', 'annual', 'custom'],
        maxSelect: 1,
      }),
    )
    tasks.fields.add(new DateField({ name: 'recurrence_end' }))
    tasks.fields.add(new BoolField({ name: 'next_instance_generated' }))
    tasks.fields.add(
      new RelationField({
        name: 'collaborators',
        collectionId: app.findCollectionByNameOrId('collaborators').id,
        maxSelect: 99,
      }),
    )
    app.save(tasks)

    const events = app.findCollectionByNameOrId('agenda_events')
    events.fields.add(
      new RelationField({ name: 'kanban_column', collectionId: cols.id, maxSelect: 1 }),
    )
    events.fields.add(new BoolField({ name: 'is_all_day' }))
    events.fields.add(
      new SelectField({
        name: 'modality',
        values: ['Presencial', 'Virtual', 'Híbrido', 'N/A'],
        maxSelect: 1,
      }),
    )
    events.fields.add(new TextField({ name: 'location' }))
    events.fields.add(
      new SelectField({
        name: 'alert_time',
        values: ['none', '15m', '30m', '1h', '1d'],
        maxSelect: 1,
      }),
    )
    events.fields.add(
      new SelectField({
        name: 'alert_type',
        values: ['none', 'in-app', 'email', 'both'],
        maxSelect: 1,
      }),
    )
    events.fields.add(new BoolField({ name: 'alert_sent' }))
    events.fields.add(new BoolField({ name: 'is_recurring' }))
    events.fields.add(
      new SelectField({
        name: 'recurrence_type',
        values: ['daily', 'weekly', 'monthly', 'annual', 'custom'],
        maxSelect: 1,
      }),
    )
    events.fields.add(new DateField({ name: 'recurrence_end' }))
    events.fields.add(new BoolField({ name: 'next_instance_generated' }))
    app.save(events)

    const crm = app.findCollectionByNameOrId('crm_interactions')
    crm.fields.add(
      new RelationField({ name: 'parent_interaction', collectionId: crm.id, maxSelect: 1 }),
    )
    crm.fields.add(new JSONField({ name: 'tags' }))
    crm.fields.add(new FileField({ name: 'attachments', maxSelect: 10, maxSize: 52428800 }))
    app.save(crm)
  },
  (app) => {
    // Empty rollback to avoid breaking other migrations
  },
)
