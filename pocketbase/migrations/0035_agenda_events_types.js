migrate(
  (app) => {
    const agenda = app.findCollectionByNameOrId('agenda_events')
    const typeField = agenda.fields.getByName('type')

    if (typeField) {
      typeField.values = [
        'Note',
        'Meeting',
        'Call',
        'Deadline',
        'Reminder',
        'Hearing',
        'Task',
        'Email',
      ]
      app.save(agenda)
    }
  },
  (app) => {
    // Revert back to original
    try {
      const agenda = app.findCollectionByNameOrId('agenda_events')
      const typeField = agenda.fields.getByName('type')
      if (typeField) {
        typeField.values = ['Note', 'Meeting', 'Call', 'Deadline', 'Reminder']
        app.save(agenda)
      }
    } catch (err) {}
  },
)
