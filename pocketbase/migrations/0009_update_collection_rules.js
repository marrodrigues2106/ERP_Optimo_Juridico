migrate(
  (app) => {
    const collections = ['lawsuits', 'finances', 'knowledge_items', 'clients', 'collaborators']

    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        col.listRule = "@request.auth.id != ''"
        col.viewRule = "@request.auth.id != ''"
        col.createRule = "@request.auth.id != ''"
        col.updateRule = "@request.auth.id != ''"
        col.deleteRule = "@request.auth.id != ''"
        app.save(col)
      } catch (e) {
        console.log('Collection not found: ' + name)
      }
    }

    try {
      const posts = app.findCollectionByNameOrId('posts')
      if (!posts.listRule) posts.listRule = ''
      if (!posts.viewRule) posts.viewRule = ''
      posts.createRule = "@request.auth.id != ''"
      posts.updateRule = "@request.auth.id != ''"
      posts.deleteRule = "@request.auth.id != ''"
      app.save(posts)
    } catch (e) {
      console.log('Collection not found: posts')
    }

    try {
      const users = app.findCollectionByNameOrId('users')
      users.listRule = 'id = @request.auth.id || @request.auth.isAdmin = true'
      users.viewRule = 'id = @request.auth.id || @request.auth.isAdmin = true'
      users.createRule = ''
      users.updateRule = 'id = @request.auth.id || @request.auth.isAdmin = true'
      users.deleteRule = '@request.auth.isAdmin = true'
      app.save(users)
    } catch (e) {
      console.log('Collection not found: users')
    }
  },
  (app) => {
    // Revert not required
  },
)
