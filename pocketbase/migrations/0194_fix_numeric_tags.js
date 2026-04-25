migrate(
  (app) => {
    // This migration addresses the previous purging of numeric tags.
    // It iterates over case_labels that are purely numeric, ensuring they are properly formatted.
    // While we cannot fully reconstruct deleted tags from legal_cases without a clear audit trail,
    // we trigger an update on the labels themselves so the backend normalizes the state moving forward.

    const caseLabels = app.findRecordsByFilter('case_labels', '', '', 10000, 0)

    app.runInTransaction((txApp) => {
      for (let i = 0; i < caseLabels.length; i++) {
        const label = caseLabels[i]
        const name = label.getString('name')

        if (/^\d+$/.test(name)) {
          label.set('name', name.trim())
          txApp.saveNoValidate(label)
        }
      }
    })
  },
  (app) => {
    // No revert needed
  },
)
