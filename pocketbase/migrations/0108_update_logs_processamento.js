migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('logs_processamento')

    if (!col.fields.getByName('termo')) {
      col.fields.add(new TextField({ name: 'termo' }))
    }
    if (!col.fields.getByName('tipo_busca')) {
      col.fields.add(new TextField({ name: 'tipo_busca' }))
    }
    if (!col.fields.getByName('periodo')) {
      col.fields.add(new TextField({ name: 'periodo' }))
    }
    if (!col.fields.getByName('metadados')) {
      col.fields.add(new JSONField({ name: 'metadados' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('logs_processamento')
    col.fields.removeByName('termo')
    col.fields.removeByName('tipo_busca')
    col.fields.removeByName('periodo')
    col.fields.removeByName('metadados')
    app.save(col)
  },
)
