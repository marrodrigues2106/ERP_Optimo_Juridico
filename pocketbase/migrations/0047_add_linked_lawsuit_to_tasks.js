migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('tasks')
    const caseCol = app.findCollectionByNameOrId('legal_cases')
    if (!col.fields.getByName('linked_lawsuit')) {
      col.fields.add(
        new RelationField({ name: 'linked_lawsuit', collectionId: caseCol.id, maxSelect: 1 }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('tasks')
    col.fields.removeByName('linked_lawsuit')
    app.save(col)
  },
)
