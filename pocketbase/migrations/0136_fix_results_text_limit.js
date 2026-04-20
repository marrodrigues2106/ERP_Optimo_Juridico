migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('results')

    const fieldsToUpdate = ['texto', 'nome_orgao', 'nome_classe', 'tipo_documento']
    for (const name of fieldsToUpdate) {
      const field = col.fields.getByName(name)
      if (field) {
        field.max = 0
      }
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('results')

    const fieldsToUpdate = ['texto', 'nome_orgao', 'nome_classe', 'tipo_documento']
    for (const name of fieldsToUpdate) {
      const field = col.fields.getByName(name)
      if (field) {
        field.max = 5000
      }
    }

    app.save(col)
  },
)
