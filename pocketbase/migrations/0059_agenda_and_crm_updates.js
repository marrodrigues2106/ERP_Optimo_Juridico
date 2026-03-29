migrate(
  (app) => {
    // 1. Update agenda_events
    const agendaEvents = app.findCollectionByNameOrId('agenda_events')

    if (!agendaEvents.fields.getByName('sync_provider')) {
      agendaEvents.fields.add(
        new SelectField({
          name: 'sync_provider',
          values: ['Google', 'iCloud', 'Outlook', 'Local'],
          maxSelect: 1,
        }),
      )
    }
    if (!agendaEvents.fields.getByName('sync_id')) {
      agendaEvents.fields.add(new TextField({ name: 'sync_id' }))
    }
    if (!agendaEvents.fields.getByName('last_synced_at')) {
      agendaEvents.fields.add(new DateField({ name: 'last_synced_at' }))
    }
    if (!agendaEvents.fields.getByName('sync_status')) {
      agendaEvents.fields.add(
        new SelectField({
          name: 'sync_status',
          values: ['Local Only', 'Synced', 'Pending', 'Error'],
          maxSelect: 1,
        }),
      )
    }
    if (!agendaEvents.fields.getByName('client')) {
      agendaEvents.fields.add(
        new RelationField({
          name: 'client',
          collectionId: app.findCollectionByNameOrId('clients').id,
          maxSelect: 1,
        }),
      )
    }
    if (!agendaEvents.fields.getByName('participants')) {
      agendaEvents.fields.add(
        new RelationField({
          name: 'participants',
          collectionId: app.findCollectionByNameOrId('collaborators').id,
          maxSelect: null,
        }),
      )
    }
    app.save(agendaEvents)

    // 2. Update legal_cases
    const legalCases = app.findCollectionByNameOrId('legal_cases')
    if (!legalCases.fields.getByName('notify_client')) {
      legalCases.fields.add(new BoolField({ name: 'notify_client' }))
      app.save(legalCases)
    }

    // 3. Update case_movements
    const caseMovements = app.findCollectionByNameOrId('case_movements')
    if (!caseMovements.fields.getByName('notified_client')) {
      caseMovements.fields.add(new BoolField({ name: 'notified_client' }))
      app.save(caseMovements)
    }

    // 4. Update gazette_publications
    const gazettePubs = app.findCollectionByNameOrId('gazette_publications')
    if (!gazettePubs.fields.getByName('is_read')) {
      gazettePubs.fields.add(new BoolField({ name: 'is_read' }))
    }
    if (!gazettePubs.fields.getByName('matched_term')) {
      gazettePubs.fields.add(new TextField({ name: 'matched_term' }))
    }
    app.save(gazettePubs)

    // 5. Create crm_interactions
    const crmInteractions = new Collection({
      name: 'crm_interactions',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'client',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('clients').id,
          maxSelect: 1,
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['Call', 'Email', 'Meeting', 'Follow-up', 'Note', 'Task'],
          maxSelect: 1,
        },
        { name: 'description', type: 'text', required: true },
        { name: 'date', type: 'date', required: true },
        { name: 'follow_up_date', type: 'date' },
        {
          name: 'responsible',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('collaborators').id,
          maxSelect: 1,
        },
        {
          name: 'linked_case',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('legal_cases').id,
          maxSelect: 1,
        },
        { name: 'status', type: 'select', values: ['Pending', 'Completed'], maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(crmInteractions)
  },
  (app) => {
    try {
      const crmInteractions = app.findCollectionByNameOrId('crm_interactions')
      app.delete(crmInteractions)
    } catch (e) {}
  },
)
