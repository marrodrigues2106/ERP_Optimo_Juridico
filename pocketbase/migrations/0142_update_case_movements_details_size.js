migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('case_movements')
    if (col) {
      const field = col.fields.getByName('details')
      if (field && field.type === 'text') {
        // Ensure no max size limits for details field to store large text blocks without truncation
        field.max = 0
        col.fields.add(field)
        app.save(col)
      }
    }
  },
  (app) => {
    // Safe to leave empty on downgrade, as removing limits doesn't break schema
  },
)
