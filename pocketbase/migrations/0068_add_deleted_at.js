migrate(
  (app) => {
    const collections = [
      'agenda_events',
      'case_movements',
      'clients',
      'collaborators',
      'tasks',
      'legal_cases',
    ]

    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        if (!col.fields.getByName('deleted_at')) {
          col.fields.add(new DateField({ name: 'deleted_at', required: false }))
          app.save(col)
        }
      } catch (e) {
        console.log('Collection not found or error:', name, e)
      }
    }

    // Ensure agenda_events collaborator and linked_lawsuit are not required to avoid generic PB validation errors
    try {
      const agendaCol = app.findCollectionByNameOrId('agenda_events')
      let changed = false
      const collabField = agendaCol.fields.getByName('collaborator')
      if (collabField && collabField.required) {
        collabField.required = false
        changed = true
      }
      const llField = agendaCol.fields.getByName('linked_lawsuit')
      if (llField && llField.required) {
        llField.required = false
        changed = true
      }
      if (changed) app.save(agendaCol)
    } catch (e) {}
  },
  (app) => {
    const collections = [
      'agenda_events',
      'case_movements',
      'clients',
      'collaborators',
      'tasks',
      'legal_cases',
    ]

    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        const field = col.fields.getByName('deleted_at')
        if (field) {
          col.fields.removeByName('deleted_at')
          app.save(col)
        }
      } catch (e) {}
    }
  },
)
