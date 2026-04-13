migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('publicacoes_dou')
    if (!col.fields.getByName('editionNumber')) {
      col.fields.add(new TextField({ name: 'editionNumber' }))
    }
    if (!col.fields.getByName('numberPage')) {
      col.fields.add(new TextField({ name: 'numberPage' }))
    }
    if (!col.fields.getByName('hierarchyStr')) {
      col.fields.add(new TextField({ name: 'hierarchyStr' }))
    }
    if (!col.fields.getByName('artType')) {
      col.fields.add(new TextField({ name: 'artType' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('publicacoes_dou')
    col.fields.removeByName('editionNumber')
    col.fields.removeByName('numberPage')
    col.fields.removeByName('hierarchyStr')
    col.fields.removeByName('artType')
    app.save(col)
  },
)
