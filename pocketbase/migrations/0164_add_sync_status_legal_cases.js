migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    col.fields.add(
      new SelectField({
        name: 'sync_status',
        values: ['pending', 'in_queue', 'syncing', 'updated', 'error'],
        maxSelect: 1,
      }),
    )
    col.fields.add(new DateField({ name: 'last_sync_attempt' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    col.fields.removeByName('sync_status')
    col.fields.removeByName('last_sync_attempt')
    app.save(col)
  },
)
