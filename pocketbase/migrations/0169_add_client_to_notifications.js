migrate(
  (app) => {
    const notifications = app.findCollectionByNameOrId('notifications')
    notifications.fields.add(
      new RelationField({
        name: 'client',
        collectionId: app.findCollectionByNameOrId('clients').id,
        maxSelect: 1,
      }),
    )
    app.save(notifications)
  },
  (app) => {
    const notifications = app.findCollectionByNameOrId('notifications')
    notifications.fields.removeByName('client')
    app.save(notifications)
  },
)
