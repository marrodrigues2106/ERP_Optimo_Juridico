migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('results')

    if (!collection.fields.getByName('legal_case')) {
      collection.fields.add(
        new RelationField({
          name: 'legal_case',
          collectionId: app.findCollectionByNameOrId('legal_cases').id,
          cascadeDelete: false,
          maxSelect: 1,
          minSelect: 0,
        }),
      )
    }

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('results')
    collection.fields.removeByName('legal_case')
    app.save(collection)
  },
)
