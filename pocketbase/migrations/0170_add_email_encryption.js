migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('email_encryption')) {
      users.fields.add(
        new SelectField({
          name: 'email_encryption',
          values: ['ssl_tls', 'starttls', 'none'],
        }),
      )
    }
    app.save(users)

    app
      .db()
      .newQuery(
        `UPDATE users SET email_encryption = 'ssl_tls' WHERE email_encryption IS NULL OR email_encryption = ''`,
      )
      .execute()
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('email_encryption')
    app.save(users)
  },
)
