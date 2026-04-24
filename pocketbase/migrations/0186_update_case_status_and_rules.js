migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('legal_cases')

    const statusField = collection.fields.getByName('lifecycle_status')
    if (statusField) {
      statusField.selectValues = ['Ativo', 'Inativo', 'Arquivado', 'Suspenso']
    }

    collection.deleteRule =
      "(@request.auth.id != '') && organization = @request.auth.active_organization && lifecycle_status = 'Arquivado'"

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('legal_cases')

    const statusField = collection.fields.getByName('lifecycle_status')
    if (statusField) {
      statusField.selectValues = ['Ativo', 'Arquivado', 'Suspenso']
    }

    app.save(collection)
  },
)
