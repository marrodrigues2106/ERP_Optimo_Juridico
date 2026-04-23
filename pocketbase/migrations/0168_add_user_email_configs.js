migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.add(new TextField({ name: 'imap_host' }))
    users.fields.add(new NumberField({ name: 'imap_port' }))
    users.fields.add(new TextField({ name: 'smtp_host' }))
    users.fields.add(new NumberField({ name: 'smtp_port' }))
    users.fields.add(new TextField({ name: 'email_user' }))
    users.fields.add(new PasswordField({ name: 'email_password' }))
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('imap_host')
    users.fields.removeByName('imap_port')
    users.fields.removeByName('smtp_host')
    users.fields.removeByName('smtp_port')
    users.fields.removeByName('email_user')
    users.fields.removeByName('email_password')
    app.save(users)
  },
)
