migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

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
    try {
      const existing = app.findAuthRecordByEmail('users', 'mmr.juridico@gmail.com')
      existing.set('isAdmin', false)
      app.save(existing)
    } catch (err) {}
  },
)
