migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    const field = col.fields.getByName('lifecycle_status')
    field.selectValues = ['Ativo', 'Arquivado', 'Suspenso', 'Excluído']
    col.addIndex('idx_legal_cases_lifecycle', false, 'lifecycle_status', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    const field = col.fields.getByName('lifecycle_status')
    field.selectValues = ['Ativo', 'Arquivado', 'Suspenso']
    col.removeIndex('idx_legal_cases_lifecycle')
    app.save(col)
  },
)
