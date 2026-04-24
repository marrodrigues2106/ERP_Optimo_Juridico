migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    const statusField = col.fields.getByName('lifecycle_status')
    statusField.selectValues = ['Ativo', 'Inativo', 'Arquivado', 'Suspenso']
    col.fields.add(statusField)
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    const statusField = col.fields.getByName('lifecycle_status')
    statusField.selectValues = ['Ativo', 'Arquivado', 'Suspenso']
    col.fields.add(statusField)
    app.save(col)
  },
)
