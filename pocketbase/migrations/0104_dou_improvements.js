migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('publicacoes_dou')

    if (!col.fields.getByName('orgao_principal')) {
      col.fields.add(new TextField({ name: 'orgao_principal' }))
    }

    if (!col.fields.getByName('organizacao_subordinada')) {
      col.fields.add(new TextField({ name: 'organizacao_subordinada' }))
    }

    if (!col.fields.getByName('organization')) {
      try {
        const orgCol = app.findCollectionByNameOrId('organizations')
        col.fields.add(
          new RelationField({
            name: 'organization',
            collectionId: orgCol.id,
            maxSelect: 1,
          }),
        )
      } catch (_) {
        // ignore if organizations collection does not exist
      }
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('publicacoes_dou')
    col.fields.removeByName('orgao_principal')
    col.fields.removeByName('organizacao_subordinada')
    col.fields.removeByName('organization')
    app.save(col)
  },
)
