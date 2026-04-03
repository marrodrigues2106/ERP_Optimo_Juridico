migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('case_movements')
    if (!col.fields.getByName('movement_details')) {
      col.fields.add(new JSONField({ name: 'movement_details', maxSize: 2000000 }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('case_movements')
    try {
      col.fields.removeByName('movement_details')
      app.save(col)
    } catch (e) {}
  },
)
