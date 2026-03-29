migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('legal_cases')

    if (!collection.fields.getByName('estimated_duration')) {
      collection.fields.add(new NumberField({ name: 'estimated_duration', min: 0 }))
    }
    if (!collection.fields.getByName('duration_unit')) {
      collection.fields.add(
        new SelectField({ name: 'duration_unit', values: ['semanas', 'meses'], maxSelect: 1 }),
      )
    }
    if (!collection.fields.getByName('allocated_fixed_cost')) {
      collection.fields.add(new NumberField({ name: 'allocated_fixed_cost', min: 0 }))
    }

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('legal_cases')
    collection.fields.removeByName('estimated_duration')
    collection.fields.removeByName('duration_unit')
    collection.fields.removeByName('allocated_fixed_cost')
    app.save(collection)
  },
)
