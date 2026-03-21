migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    let admin
    try {
      admin = app.findAuthRecordByEmail('users', 'mmr.juridico@gmail.com')
    } catch (err) {
      admin = new Record(users)
      admin.setEmail('mmr.juridico@gmail.com')
    }

    admin.setPassword('securepassword123')
    admin.set('isAdmin', true)
    admin.setVerified(true)

    app.save(admin)
  },
  (app) => {
    // Revert not required
  },
)
