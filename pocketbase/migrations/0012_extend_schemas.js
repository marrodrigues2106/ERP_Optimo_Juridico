migrate(
  (app) => {
    // Users
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('fullName')) users.fields.add(new TextField({ name: 'fullName' }))
    if (!users.fields.getByName('cpf')) users.fields.add(new TextField({ name: 'cpf' }))
    if (!users.fields.getByName('idNumber')) users.fields.add(new TextField({ name: 'idNumber' }))
    if (!users.fields.getByName('phone')) users.fields.add(new TextField({ name: 'phone' }))
    if (!users.fields.getByName('address')) users.fields.add(new TextField({ name: 'address' }))
    if (!users.fields.getByName('birthDate')) users.fields.add(new DateField({ name: 'birthDate' }))
    app.save(users)

    // Clients
    const clients = app.findCollectionByNameOrId('clients')
    if (!clients.fields.getByName('fullName'))
      clients.fields.add(new TextField({ name: 'fullName' }))
    if (!clients.fields.getByName('cpf')) clients.fields.add(new TextField({ name: 'cpf' }))
    if (!clients.fields.getByName('idNumber'))
      clients.fields.add(new TextField({ name: 'idNumber' }))
    if (!clients.fields.getByName('address')) clients.fields.add(new TextField({ name: 'address' }))
    if (!clients.fields.getByName('birthDate'))
      clients.fields.add(new DateField({ name: 'birthDate' }))
    if (!clients.fields.getByName('nationality'))
      clients.fields.add(new TextField({ name: 'nationality' }))
    if (!clients.fields.getByName('maritalStatus'))
      clients.fields.add(new TextField({ name: 'maritalStatus' }))
    if (!clients.fields.getByName('profession'))
      clients.fields.add(new TextField({ name: 'profession' }))
    app.save(clients)

    // Collaborators
    const collaborators = app.findCollectionByNameOrId('collaborators')
    if (!collaborators.fields.getByName('fullName'))
      collaborators.fields.add(new TextField({ name: 'fullName' }))
    if (!collaborators.fields.getByName('cpf'))
      collaborators.fields.add(new TextField({ name: 'cpf' }))
    if (!collaborators.fields.getByName('idNumber'))
      collaborators.fields.add(new TextField({ name: 'idNumber' }))
    if (!collaborators.fields.getByName('address'))
      collaborators.fields.add(new TextField({ name: 'address' }))
    if (!collaborators.fields.getByName('birthDate'))
      collaborators.fields.add(new DateField({ name: 'birthDate' }))
    if (!collaborators.fields.getByName('oabNumber'))
      collaborators.fields.add(new TextField({ name: 'oabNumber' }))
    if (!collaborators.fields.getByName('oabSectional'))
      collaborators.fields.add(new TextField({ name: 'oabSectional' }))
    app.save(collaborators)
  },
  (app) => {
    // Down migration can be complex with fields, safely skipping for append-only schema updates
  },
)
