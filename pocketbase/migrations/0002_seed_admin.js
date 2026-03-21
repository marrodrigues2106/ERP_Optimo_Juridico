migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const record = new Record(users)
    record.setEmail('mmr.juridico@gmail.com')
    record.setPassword('securepassword123')
    record.setVerified(true)
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'mmr.juridico@gmail.com')
      app.delete(record)
    } catch (_) {}
  },
)
