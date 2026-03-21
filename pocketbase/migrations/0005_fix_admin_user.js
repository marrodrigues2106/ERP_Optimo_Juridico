migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    // Modify the minimum password length requirement
    const passwordField = users.fields.getByName('password')
    if (passwordField) {
      passwordField.min = 4
      app.save(users)
    }

    try {
      const existing = app.findAuthRecordByEmail('users', 'mmr.juridico@gmail.com')
      existing.set('isAdmin', true)
      existing.setPassword('1234')
      existing.setVerified(true)
      app.save(existing)
    } catch (err) {
      const admin = new Record(users)
      admin.setEmail('mmr.juridico@gmail.com')
      admin.setPassword('1234')
      admin.set('isAdmin', true)
      admin.setVerified(true)
      app.save(admin)
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    // Revert the password length requirement to the default 8
    const passwordField = users.fields.getByName('password')
    if (passwordField) {
      passwordField.min = 8
      app.save(users)
    }

    try {
      const existing = app.findAuthRecordByEmail('users', 'mmr.juridico@gmail.com')
      existing.setPassword('12345678')
      app.save(existing)
    } catch (err) {}
  },
)
