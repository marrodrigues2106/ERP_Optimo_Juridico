migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('is_system_dispatcher')) {
      users.fields.add(new BoolField({ name: 'is_system_dispatcher' }))
    }
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('is_system_dispatcher')
    app.save(users)
  },
)
