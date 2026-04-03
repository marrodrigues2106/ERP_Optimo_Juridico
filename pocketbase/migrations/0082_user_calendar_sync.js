migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (!col.fields.getByName('calendar_provider')) {
      col.fields.add(
        new SelectField({
          name: 'calendar_provider',
          maxSelect: 1,
          values: ['Google', 'Outlook', 'iCloud', 'Local'],
        }),
      )
    }
    if (!col.fields.getByName('calendar_status')) {
      col.fields.add(
        new SelectField({
          name: 'calendar_status',
          maxSelect: 1,
          values: ['Connected', 'Pending', 'Disconnected', 'Error'],
        }),
      )
    }
    if (!col.fields.getByName('calendar_token')) {
      col.fields.add(new TextField({ name: 'calendar_token' }))
    }
    if (!col.fields.getByName('ical_token')) {
      col.fields.add(new TextField({ name: 'ical_token' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.fields.removeByName('calendar_provider')
    col.fields.removeByName('calendar_status')
    col.fields.removeByName('calendar_token')
    col.fields.removeByName('ical_token')
    app.save(col)
  },
)
