migrate(
  (app) => {
    const casesCol = app.findCollectionByNameOrId('legal_cases')

    casesCol.fields.add(new DateField({ name: 'pje_last_sync' }))
    casesCol.fields.add(
      new SelectField({
        name: 'pje_sync_status',
        values: ['idle', 'pending', 'syncing', 'error'],
        maxSelect: 1,
      }),
    )

    casesCol.addIndex('idx_legal_cases_pje_status', false, 'pje_sync_status', '')
    casesCol.addIndex('idx_legal_cases_pje_last_sync', false, 'pje_last_sync', '')

    app.save(casesCol)

    app
      .db()
      .newQuery(
        `UPDATE legal_cases SET pje_sync_status = 'idle' WHERE pje_sync_status IS NULL OR pje_sync_status = ''`,
      )
      .execute()

    const orgsCol = app.findCollectionByNameOrId('organizations')

    const logsCol = new Collection({
      name: 'pje_sync_logs',
      type: 'base',
      listRule: "@request.auth.id != '' && organization = @request.auth.active_organization",
      viewRule: "@request.auth.id != '' && organization = @request.auth.active_organization",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'case',
          type: 'relation',
          required: true,
          collectionId: casesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['success', 'failed'],
          maxSelect: 1,
        },
        { name: 'message', type: 'text' },
        { name: 'duration', type: 'number' },
        { name: 'organization', type: 'relation', collectionId: orgsCol.id, maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })

    app.save(logsCol)
  },
  (app) => {
    try {
      const logsCol = app.findCollectionByNameOrId('pje_sync_logs')
      app.delete(logsCol)
    } catch (_) {}

    const casesCol = app.findCollectionByNameOrId('legal_cases')
    casesCol.removeField('pje_last_sync')
    casesCol.removeField('pje_sync_status')
    casesCol.removeIndex('idx_legal_cases_pje_status')
    casesCol.removeIndex('idx_legal_cases_pje_last_sync')
    app.save(casesCol)
  },
)
