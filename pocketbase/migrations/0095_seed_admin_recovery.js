migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    let record
    try {
      record = app.findAuthRecordByEmail('users', 'mmr.juridico@gmail.com')
    } catch (_) {
      record = new Record(users)
      record.setEmail('mmr.juridico@gmail.com')
    }
    record.setPassword('Skip@Pass')
    record.setVerified(true)
    record.set('role', 'admin')
    record.set('isAdmin', true)
    app.save(record)
  },
  (app) => {
    // Down migration intentionally left empty to preserve admin account
  },
)
