migrate(
  (app) => {
    const finances = app.findCollectionByNameOrId('finances')
    if (!finances.fields.getByName('is_archived')) {
      finances.fields.add(new BoolField({ name: 'is_archived' }))
    }
    if (!finances.fields.getByName('is_read')) {
      finances.fields.add(new BoolField({ name: 'is_read' }))
    }
    app.save(finances)

    const notifications = app.findCollectionByNameOrId('notifications')
    if (!notifications.fields.getByName('is_archived')) {
      notifications.fields.add(new BoolField({ name: 'is_archived' }))
    }
    app.save(notifications)
  },
  (app) => {
    const finances = app.findCollectionByNameOrId('finances')
    finances.fields.removeByName('is_archived')
    finances.fields.removeByName('is_read')
    app.save(finances)

    const notifications = app.findCollectionByNameOrId('notifications')
    notifications.fields.removeByName('is_archived')
    app.save(notifications)
  },
)
