migrate(
  (app) => {
    const cases = app.findRecordsByFilter('legal_cases', 'tags != null', '', 100000, 0)
    for (let i = 0; i < cases.length; i++) {
      const record = cases[i]
      const tags = record.get('tags')
      if (!tags) continue

      let tagsArray = []
      if (typeof tags === 'string') {
        try {
          tagsArray = JSON.parse(tags)
        } catch (_) {}
      } else if (Array.isArray(tags)) {
        tagsArray = tags
      }

      if (!Array.isArray(tagsArray)) continue

      let changed = false
      const newTags = []

      for (let j = 0; j < tagsArray.length; j++) {
        const t = tagsArray[j]
        if (typeof t === 'string' && t.trim() !== '') {
          if (/^\d+$/.test(t.trim())) {
            changed = true // Drop numeric tags
          } else {
            newTags.push(t.trim())
          }
        } else {
          changed = true // Drop non-strings
        }
      }

      if (changed) {
        record.set('tags', newTags)
        app.saveNoValidate(record)
      }
    }
  },
  (app) => {
    // Reverting data cleanup is not strictly necessary
  },
)
