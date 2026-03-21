migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['admin', 'legal_team', 'admin_user', 'financial_user'],
          maxSelect: 1,
        }),
      )
    }
    app.save(users)
  },
  (app) => {},
)
