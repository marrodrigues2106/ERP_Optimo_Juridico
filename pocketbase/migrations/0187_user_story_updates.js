migrate(
  (app) => {
    const legalCases = app.findCollectionByNameOrId('legal_cases')
    const clientField = legalCases.fields.getByName('client')
    if (clientField) {
      clientField.maxSelect = 2000000
    }
    const lifecycleField = legalCases.fields.getByName('lifecycle_status')
    if (lifecycleField) {
      if (!lifecycleField.values.includes('Inativo')) {
        lifecycleField.values.push('Inativo')
      }
    }
    app.save(legalCases)

    const clients = app.findCollectionByNameOrId('clients')
    if (!clients.fields.getByName('phone_numbers')) {
      clients.fields.add(new JSONField({ name: 'phone_numbers' }))
    }
    app.save(clients)
  },
  (app) => {
    const clients = app.findCollectionByNameOrId('clients')
    const phoneField = clients.fields.getByName('phone_numbers')
    if (phoneField) {
      clients.fields.removeByName('phone_numbers')
      app.save(clients)
    }
  },
)
