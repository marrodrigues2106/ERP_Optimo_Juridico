migrate(
  (app) => {
    const lawsuits = app.findCollectionByNameOrId('lawsuits')

    // Ensure datajudStatus has no hidden validation constraints that could block "Sync Requested"
    let statusField = lawsuits.fields.getByName('datajudStatus')
    if (!statusField) {
      lawsuits.fields.add(new TextField({ name: 'datajudStatus' }))
    } else {
      statusField.pattern = ''
      statusField.min = 0
      statusField.max = 0
      statusField.required = false
    }

    // Ensure trackingLogs is a proper JSON field with sufficient size
    let logsField = lawsuits.fields.getByName('trackingLogs')
    if (!logsField) {
      lawsuits.fields.add(new JSONField({ name: 'trackingLogs', maxSize: 5242880 }))
    } else {
      logsField.maxSize = 5242880 // 5MB to accommodate large process histories
      logsField.required = false
    }

    app.save(lawsuits)
  },
  (app) => {
    // Reverting validation constraint removal is intentionally left blank
  },
)
