migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('collaborators')
    col.addIndex('idx_collaborators_user_unique', true, 'user', "user != ''")
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('collaborators')
    col.removeIndex('idx_collaborators_user_unique')
    app.save(col)
  },
)
