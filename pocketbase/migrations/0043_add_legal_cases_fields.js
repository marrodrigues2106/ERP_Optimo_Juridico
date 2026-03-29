migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('legal_cases')

    if (!collection.fields.getByName('court_organ')) {
      collection.fields.add(new TextField({ name: 'court_organ' }))
    }
    if (!collection.fields.getByName('distribution_date')) {
      collection.fields.add(new DateField({ name: 'distribution_date' }))
    }

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('legal_cases')

    if (collection.fields.getByName('court_organ')) {
      collection.fields.removeByName('court_organ')
    }
    if (collection.fields.getByName('distribution_date')) {
      collection.fields.removeByName('distribution_date')
    }

    app.save(collection)
  },
)
