migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('case_movements')
    if (!col.fields.getByName('document_identifiers')) {
      col.fields.add(
        new JSONField({
          name: 'document_identifiers',
          required: false,
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('case_movements')
    if (col.fields.getByName('document_identifiers')) {
      col.fields.removeByName('document_identifiers')
      app.save(col)
    }
  },
)
