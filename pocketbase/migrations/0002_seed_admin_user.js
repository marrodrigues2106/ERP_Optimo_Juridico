migrate(
  (app) => {
    let users
    try {
      users = app.findCollectionByNameOrId('_pb_users_auth_')
    } catch (_) {
      return
    }

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'mmr.juridico@gmail.com')
      return
    } catch (_) {}

    const record = new Record(users)
    record.setEmail('mmr.juridico@gmail.com')
    record.setPassword('Skip@Pass')
    record.setVerified(true)
    record.set('name', 'Admin')
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'mmr.juridico@gmail.com')
      app.delete(record)
    } catch (_) {}
  },
)
