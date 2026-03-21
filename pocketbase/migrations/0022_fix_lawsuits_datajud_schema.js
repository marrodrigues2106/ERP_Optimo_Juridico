migrate(
  (app) => {
    const lawsuits = app.findCollectionByNameOrId('lawsuits')

    // Remove any restrictive text validation rules that block "Sync Requested"
    let statusField = lawsuits.fields.getByName('datajudStatus')
    if (statusField) {
      statusField.pattern = ''
      statusField.min = null
      statusField.max = 255 // Setting a generous max avoids zero-length constraints
      statusField.required = false
    }

    app.save(lawsuits)
  },
  (app) => {
    // Intentionally left blank to avoid reverting the fix
  },
)
