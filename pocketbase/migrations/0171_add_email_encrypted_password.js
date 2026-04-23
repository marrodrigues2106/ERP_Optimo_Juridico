migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (!col.fields.getByName('email_encrypted_password')) {
      col.fields.add(new TextField({ name: 'email_encrypted_password' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.fields.removeByName('email_encrypted_password')
    app.save(col)
  },
)
