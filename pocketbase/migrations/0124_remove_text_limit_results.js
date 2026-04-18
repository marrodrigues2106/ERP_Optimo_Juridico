migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('results')
    if (col.fields.getByName('texto')) {
      col.fields.add(
        new TextField({
          name: 'texto',
          required: false,
          max: 0,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('results')
    if (col.fields.getByName('texto')) {
      col.fields.add(
        new TextField({
          name: 'texto',
          required: false,
          max: 5000,
        }),
      )
      app.save(col)
    }
  },
)
