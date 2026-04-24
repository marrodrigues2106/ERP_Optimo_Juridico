migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('termos_monitorados')

    const tipoTermoField = collection.fields.getByName('tipo_termo')
    if (tipoTermoField && !tipoTermoField.values.includes('Livre')) {
      tipoTermoField.values.push('Livre')
    }

    if (!collection.fields.getByName('search_method')) {
      collection.fields.add(
        new SelectField({
          name: 'search_method',
          values: ['palavra-chave', 'frase_exata', 'regex'],
        }),
      )
    }

    app.save(collection)

    try {
      app.findFirstRecordByData('settings', 'key', 'default_sender_email')
    } catch (_) {
      const settingsCol = app.findCollectionByNameOrId('settings')
      const record = new Record(settingsCol)
      record.set('key', 'default_sender_email')
      record.set('value', 'onboarding@resend.dev')
      app.save(record)
    }

    try {
      const notifCollection = app.findCollectionByNameOrId('notifications')
      notifCollection.listRule = "@request.auth.id != '' && user_id = @request.auth.id"
      notifCollection.viewRule = "@request.auth.id != '' && user_id = @request.auth.id"
      app.save(notifCollection)
    } catch (_) {}
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('termos_monitorados')

    const tipoTermoField = collection.fields.getByName('tipo_termo')
    if (tipoTermoField) {
      tipoTermoField.values = tipoTermoField.values.filter((v) => v !== 'Livre')
    }

    collection.fields.removeByName('search_method')

    app.save(collection)

    try {
      const record = app.findFirstRecordByData('settings', 'key', 'default_sender_email')
      if (record.getString('value') === 'onboarding@resend.dev') {
        app.delete(record)
      }
    } catch (_) {}
  },
)
