migrate(
  (app) => {
    const clients = app.findCollectionByNameOrId('clients')
    if (!clients.fields.getByName('classification')) {
      clients.fields.add(
        new SelectField({
          name: 'classification',
          values: ['Ativo', 'Inativo', 'Lead'],
          maxSelect: 1,
        }),
      )
    }
    app.save(clients)
  },
  (app) => {},
)
