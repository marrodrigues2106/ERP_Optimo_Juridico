migrate(
  (app) => {
    // As an additional database-level safeguard, we enable native cascading deletion
    // on the relations to ensure the SQLite integrity constraints are satisfied
    // even if records are deleted internally or via the Admin UI.

    const movements = app.findCollectionByNameOrId('lawsuit_movements')
    const movField = movements.fields.getByName('lawsuit')
    if (movField) {
      movField.cascadeDelete = true
      app.save(movements)
    }

    const notifications = app.findCollectionByNameOrId('lawsuit_notifications')
    const notifField = notifications.fields.getByName('lawsuit')
    if (notifField) {
      notifField.cascadeDelete = true
      app.save(notifications)
    }

    const events = app.findCollectionByNameOrId('agenda_events')
    const eventField = events.fields.getByName('linked_lawsuit')
    if (eventField) {
      eventField.cascadeDelete = true
      app.save(events)
    }
  },
  (app) => {
    const movements = app.findCollectionByNameOrId('lawsuit_movements')
    const movField = movements.fields.getByName('lawsuit')
    if (movField) {
      movField.cascadeDelete = false
      app.save(movements)
    }

    const notifications = app.findCollectionByNameOrId('lawsuit_notifications')
    const notifField = notifications.fields.getByName('lawsuit')
    if (notifField) {
      notifField.cascadeDelete = false
      app.save(notifications)
    }

    const events = app.findCollectionByNameOrId('agenda_events')
    const eventField = events.fields.getByName('linked_lawsuit')
    if (eventField) {
      eventField.cascadeDelete = false
      app.save(events)
    }
  },
)
