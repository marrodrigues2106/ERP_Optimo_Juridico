migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    if (!col.fields.getByName('related_cases')) {
      col.fields.add(
        new RelationField({ name: 'related_cases', collectionId: col.id, maxSelect: 100 }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    col.fields.removeByName('related_cases')
    app.save(col)
  },
)
