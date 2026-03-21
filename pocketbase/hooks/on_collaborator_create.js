onRecordAfterCreateSuccess((e) => {
  const collab = e.record
  const email = collab.get('email')
  const fullName = collab.get('fullName') || collab.get('name')

  if (!email) return

  const usersCollection = $app.findCollectionByNameOrId('users')

  try {
    // Check if user already exists
    $app.findAuthRecordByEmail('users', email)
  } catch (err) {
    // Not found, so we create a new user account
    const userRecord = new Record(usersCollection)
    userRecord.setEmail(email)
    userRecord.setPassword($security.randomString(16))
    userRecord.setVerified(true)

    userRecord.set('name', fullName)
    userRecord.set('fullName', fullName)
    userRecord.set('cpf', collab.get('cpf'))
    userRecord.set('idNumber', collab.get('idNumber'))
    userRecord.set('phone', collab.get('phone'))
    userRecord.set('address', collab.get('address'))
    userRecord.set('birthDate', collab.get('birthDate'))

    $app.save(userRecord)
  }

  e.next()
}, 'collaborators')
