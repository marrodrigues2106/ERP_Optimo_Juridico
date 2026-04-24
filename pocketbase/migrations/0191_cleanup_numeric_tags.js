migrate(
  (app) => {
    const cases = app.findRecordsByFilter(
      'legal_cases',
      "tags != null && tags != '' && tags != '[]'",
      '',
      100000,
      0,
    )
    const labels = app.findRecordsByFilter('case_labels', '1=1', '', 100000, 0)

    const validLabelsByOrg = {}
    for (let i = 0; i < labels.length; i++) {
      const org = labels[i].getString('organization')
      if (!validLabelsByOrg[org]) validLabelsByOrg[org] = []
      validLabelsByOrg[org].push(labels[i].getString('name'))
    }

    app.runInTransaction((txApp) => {
      for (let i = 0; i < cases.length; i++) {
        const c = cases[i]
        const org = c.getString('organization')
        const validLabels = validLabelsByOrg[org] || []

        let rawTags = c.get('tags')
        let tags = []

        if (typeof rawTags === 'string') {
          try {
            tags = JSON.parse(rawTags)
          } catch (e) {
            tags = []
          }
        } else if (Array.isArray(rawTags)) {
          tags = rawTags
        }

        if (Array.isArray(tags) && tags.length > 0) {
          const originalLength = tags.length

          const cleanTags = tags.filter((t) => {
            if (typeof t !== 'string') return false
            if (/^\d+$/.test(t)) return false // Remove IDs or purely numeric values
            if (validLabels.indexOf(t) === -1) return false // Must correspond to a valid label name
            return true
          })

          if (cleanTags.length !== originalLength) {
            c.set('tags', cleanTags)
            txApp.saveNoValidate(c)
          }
        }
      }
    })
  },
  (app) => {
    // Irreversible data cleanup migration
  },
)
