migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    if (!col.fields.getByName('estimated_total_cost')) {
      col.fields.add(new NumberField({ name: 'estimated_total_cost' }))
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    if (col.fields.getByName('estimated_total_cost')) {
      col.fields.removeByName('estimated_total_cost')
      app.save(col)
    }
  },
)
