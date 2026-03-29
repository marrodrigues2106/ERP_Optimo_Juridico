migrate(
  (app) => {
    // 1. Ensure the lawsuits collection has an explicit deleteRule allowing authenticated users
    const lawsuits = app.findCollectionByNameOrId('lawsuits')
    lawsuits.deleteRule = "@request.auth.id != ''"
    app.save(lawsuits)

    // 2. Ensure cascadeDelete is enabled for child relations to avoid SQL RESTRICT errors
    const movements = app.findCollectionByNameOrId('lawsuit_movements')
    const movementsField = movements.fields.getByName('lawsuit')
    if (movementsField) {
      movementsField.cascadeDelete = true
      app.save(movements)
    }

    const notifications = app.findCollectionByNameOrId('lawsuit_notifications')
    const notificationsField = notifications.fields.getByName('lawsuit')
    if (notificationsField) {
      notificationsField.cascadeDelete = true
      app.save(notifications)
    }

    const agenda = app.findCollectionByNameOrId('agenda_events')
    const agendaField = agenda.fields.getByName('linked_lawsuit')
    if (agendaField) {
      agendaField.cascadeDelete = true
      app.save(agenda)
    }
  },
  (app) => {
    try {
      const movements = app.findCollectionByNameOrId('lawsuit_movements')
      const movementsField = movements.fields.getByName('lawsuit')
      if (movementsField) {
        movementsField.cascadeDelete = false
        app.save(movements)
      }
    } catch (e) {}

    try {
      const notifications = app.findCollectionByNameOrId('lawsuit_notifications')
      const notificationsField = notifications.fields.getByName('lawsuit')
      if (notificationsField) {
        notificationsField.cascadeDelete = false
        app.save(notifications)
      }
    } catch (e) {}

    try {
      const agenda = app.findCollectionByNameOrId('agenda_events')
      const agendaField = agenda.fields.getByName('linked_lawsuit')
      if (agendaField) {
        agendaField.cascadeDelete = false
        app.save(agenda)
      }
    } catch (e) {}
  },
)
