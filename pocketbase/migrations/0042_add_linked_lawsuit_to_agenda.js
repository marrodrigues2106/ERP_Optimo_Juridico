migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('agenda_events')
    if (!col.fields.getByName('linked_lawsuit')) {
      col.fields.add(
        new RelationField({
          name: 'linked_lawsuit',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('legal_cases').id,
          cascadeDelete: true,
          maxSelect: 1,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('agenda_events')
    col.fields.removeByName('linked_lawsuit')
    app.save(col)
  },
)
