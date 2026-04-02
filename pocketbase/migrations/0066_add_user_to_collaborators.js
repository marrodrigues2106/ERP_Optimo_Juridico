migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('collaborators')
    if (!col.fields.getByName('user')) {
      col.fields.add(
        new RelationField({
          name: 'user',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('collaborators')
    col.fields.removeByName('user')
    app.save(col)
  },
)
