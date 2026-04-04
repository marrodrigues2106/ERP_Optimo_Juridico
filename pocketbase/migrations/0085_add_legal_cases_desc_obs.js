migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')

    if (!col.fields.getByName('description')) {
      col.fields.add(new TextField({ name: 'description' }))
    }
    if (!col.fields.getByName('observations')) {
      col.fields.add(new TextField({ name: 'observations' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    col.fields.removeByName('description')
    col.fields.removeByName('observations')
    app.save(col)
  },
)
