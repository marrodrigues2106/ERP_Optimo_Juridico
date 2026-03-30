migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('organizations')

    if (!col.fields.getByName('cnpj')) {
      col.fields.add(new TextField({ name: 'cnpj' }))
    }
    if (!col.fields.getByName('address')) {
      col.fields.add(new TextField({ name: 'address' }))
    }
    if (!col.fields.getByName('email')) {
      col.fields.add(new EmailField({ name: 'email' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('organizations')

    try {
      col.fields.removeByName('cnpj')
      col.fields.removeByName('address')
      col.fields.removeByName('email')
      app.save(col)
    } catch (err) {
      // ignore if fields don't exist
    }
  },
)
