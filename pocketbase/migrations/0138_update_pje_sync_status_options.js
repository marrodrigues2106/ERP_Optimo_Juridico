migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    const field = col.fields.getByName('pje_sync_status')
    if (field) {
      const vals = field.values || []
      if (!vals.includes('success')) {
        vals.push('success')
        field.values = vals
      }
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('legal_cases')
    const field = col.fields.getByName('pje_sync_status')
    if (field) {
      const vals = field.values || []
      field.values = vals.filter((v) => v !== 'success')
    }
    app.save(col)
  },
)
