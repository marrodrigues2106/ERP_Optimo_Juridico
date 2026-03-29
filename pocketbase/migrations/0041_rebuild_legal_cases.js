migrate(
  (app) => {
    // Clean up legacy relations in agenda_events to avoid reference errors
    try {
      const agenda = app.findCollectionByNameOrId('agenda_events')
      const field = agenda.fields.getByName('linked_lawsuit')
      if (field) {
        agenda.fields.removeByName('linked_lawsuit')
        app.save(agenda)
      }
    } catch (_) {}

    // Drop legacy collections
    const legacyDrops = ['lawsuit_notifications', 'lawsuit_movements', 'lawsuits']
    for (const name of legacyDrops) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }

    // Create legal_cases collection
    const clientsCol = app.findCollectionByNameOrId('clients')
    const collaboratorsCol = app.findCollectionByNameOrId('collaborators')

    const legalCases = new Collection({
      name: 'legal_cases',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'case_number', type: 'text' },
        { name: 'type', type: 'select', values: ['Processo', 'Serviço Jurídico'], required: true },
        { name: 'court', type: 'text' },
        { name: 'parties', type: 'text', required: true },
        { name: 'status', type: 'text' },
        { name: 'deadline', type: 'date' },
        { name: 'client', type: 'relation', collectionId: clientsCol.id, maxSelect: 1 },
        {
          name: 'responsible_collaborator',
          type: 'relation',
          collectionId: collaboratorsCol.id,
          maxSelect: 1,
        },
        { name: 'is_favorite', type: 'bool' },
        {
          name: 'lifecycle_status',
          type: 'select',
          values: ['Ativo', 'Arquivado', 'Suspenso'],
          required: true,
        },
        { name: 'datajud_last_sync', type: 'date' },
        { name: 'datajud_sync_status', type: 'text' },
        { name: 'metadata', type: 'json' },
        { name: 'search_after_token', type: 'text' },
        { name: 'court_alias', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_legal_cases_number ON legal_cases (case_number)'],
    })
    app.save(legalCases)

    // Create case_movements collection
    const caseMovements = new Collection({
      name: 'case_movements',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'case',
          type: 'relation',
          collectionId: legalCases.id,
          required: true,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'event_date', type: 'date', required: true },
        { name: 'description', type: 'text', required: true },
        {
          name: 'source',
          type: 'select',
          values: ['DataJud', 'Tribunal', 'Diário', 'Manual'],
          required: true,
        },
        { name: 'external_id', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_case_movements_ext_id ON case_movements (external_id) WHERE external_id != ''",
      ],
    })
    app.save(caseMovements)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('case_movements'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('legal_cases'))
    } catch (_) {}
  },
)
