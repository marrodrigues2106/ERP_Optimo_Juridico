migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const orgs = app.findCollectionByNameOrId('organizations')

    let org
    try {
      org = app.findFirstRecordByData('organizations', 'name', 'Moraes Rodrigues Advocacia')
    } catch (_) {
      org = new Record(orgs)
      org.set('name', 'Moraes Rodrigues Advocacia')
      app.save(org)
    }

    let user
    try {
      user = app.findAuthRecordByEmail('users', 'mmr.juridico@gmail.com')
    } catch (_) {
      user = new Record(users)
      user.setEmail('mmr.juridico@gmail.com')
      user.setPassword('Skip@Pass123')
    }

    user.setVerified(true)
    user.set('name', 'Admin')
    user.set('isAdmin', true)
    user.set('role', 'admin')

    let orgsList = user.get('organizations') || []
    let newOrgsList = Array.isArray(orgsList) ? orgsList : orgsList ? [orgsList] : []
    if (!newOrgsList.includes(org.id)) {
      newOrgsList.push(org.id)
    }
    user.set('organizations', newOrgsList)
    user.set('active_organization', org.id)

    app.save(user)
  },
  (app) => {
    // Irreversible or not needed to revert
  },
)
