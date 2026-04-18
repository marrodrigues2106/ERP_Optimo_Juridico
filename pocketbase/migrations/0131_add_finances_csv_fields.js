migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('finances')

    if (!col.fields.getByName('category_code')) {
      col.fields.add(new TextField({ name: 'category_code' }))
    }
    if (!col.fields.getByName('metadata')) {
      col.fields.add(new JSONField({ name: 'metadata' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('finances')

    if (col.fields.getByName('category_code')) {
      col.fields.removeByName('category_code')
    }
    if (col.fields.getByName('metadata')) {
      col.fields.removeByName('metadata')
    }

    app.save(col)
  },
)
