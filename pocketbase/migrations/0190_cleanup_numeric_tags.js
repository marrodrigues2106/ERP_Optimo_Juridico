migrate(
  (app) => {
    const cases = app.findRecordsByFilter(
      'legal_cases',
      "tags != '' && tags != 'null' && tags != '[]'",
      '',
      100000,
      0,
    )

    for (const record of cases) {
      let rawTags = record.get('tags')
      let tags = []

      if (Array.isArray(rawTags)) {
        tags = rawTags
      } else if (typeof rawTags === 'string') {
        try {
          tags = JSON.parse(rawTags)
        } catch (e) {}
      }

      if (Array.isArray(tags)) {
        // strictly numeric
        const filteredTags = tags.filter((t) => typeof t === 'string' && !/^\d+$/.test(t))

        if (filteredTags.length !== tags.length) {
          record.set('tags', filteredTags)
          app.saveNoValidate(record)
        }
      }
    }
  },
  (app) => {
    // Irreversible
  },
)
