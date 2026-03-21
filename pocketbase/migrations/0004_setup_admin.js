migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    if (!users.fields.getByName('isAdmin')) {
      users.fields.add(new BoolField({ name: 'isAdmin' }))
    }

    users.listRule = 'id = @request.auth.id || @request.auth.isAdmin = true'
    users.viewRule = 'id = @request.auth.id || @request.auth.isAdmin = true'
    users.updateRule = 'id = @request.auth.id || @request.auth.isAdmin = true'
    users.deleteRule = '@request.auth.isAdmin = true'

    app.save(users)

    try {
      const existing = app.findAuthRecordByEmail('users', 'mmr.juridico@gmail.com')
      existing.set('isAdmin', true)
      existing.setPassword('12345678')
      existing.setVerified(true)
      app.save(existing)
    } catch (err) {
      const admin = new Record(users)
      admin.setEmail('mmr.juridico@gmail.com')
      admin.setPassword('12345678')
      admin.set('isAdmin', true)
      admin.setVerified(true)
      app.save(admin)
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (users.fields.getByName('isAdmin')) {
      users.fields.removeByName('isAdmin')
    }
    users.listRule = 'id = @request.auth.id'
    users.viewRule = 'id = @request.auth.id'
    users.updateRule = 'id = @request.auth.id'
    users.deleteRule = 'id = @request.auth.id'
    app.save(users)
  },
)
