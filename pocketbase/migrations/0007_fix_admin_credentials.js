migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    // Update password field to allow minimum of 4 characters, required for setting it to '1234'
    try {
      const pwdField = users.fields.getByName('password')
      if (pwdField) {
        pwdField.min = 4
        app.save(users)
      } else if (users.authOptions) {
        users.authOptions.minPasswordLength = 4
        app.save(users)
      }
    } catch (e) {
      console.log('Failed to update password min length:', e)
    }

    let admin
    try {
      admin = app.findAuthRecordByEmail('users', 'mmr.juridico@gmail.com')
    } catch (err) {
      admin = new Record(users)
      admin.setEmail('mmr.juridico@gmail.com')
    }

    admin.setPassword('1234')
    admin.set('isAdmin', true)
    admin.setVerified(true)

    app.save(admin)
  },
  (app) => {
    // Revert not required
  },
)
