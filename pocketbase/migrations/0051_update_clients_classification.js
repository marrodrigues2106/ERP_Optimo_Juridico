migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('clients')
    const field = col.fields.getByName('classification')
    field.selectValues = ['Ativo', 'Inativo', 'Lead', 'Parte Envolvida']
    col.addIndex('idx_clients_classification', false, 'classification', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('clients')
    const field = col.fields.getByName('classification')
    field.selectValues = ['Ativo', 'Inativo', 'Lead']
    col.removeIndex('idx_clients_classification')
    app.save(col)
  },
)
