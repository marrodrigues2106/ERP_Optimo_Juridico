migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('termos_monitorados')
    const field = collection.fields.getByName('tipo_termo')
    if (field) {
      field.values = [
        'palavra-chave',
        'frase',
        'regex',
        'Nome Advogado',
        'Nome Parte',
        'OAB',
        'CPF',
        'Outros',
      ]
    }
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('termos_monitorados')
    const field = collection.fields.getByName('tipo_termo')
    if (field) {
      field.values = ['palavra-chave', 'frase', 'regex']
    }
    app.save(collection)
  },
)
