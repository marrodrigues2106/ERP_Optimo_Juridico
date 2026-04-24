routerAdd(
  'POST',
  '/backend/v1/tags/rename',
  (e) => {
    const body = e.requestInfo().body
    const oldTag = body.oldTag
    const newTag = body.newTag
    if (!oldTag || !newTag) {
      throw new BadRequestError('oldTag and newTag are required')
    }

    // Use '~' to pre-filter records where the JSON string representation contains the term
    // This is highly efficient to narrow down candidates, then we exactly match in JS
    const cases = $app.findRecordsByFilter('legal_cases', 'tags ~ {:old}', '-created', 10000, 0, {
      old: oldTag,
    })
    let count = 0

    $app.runInTransaction((txApp) => {
      for (let record of cases) {
        let tags = record.get('tags') || []

        // Sometimes tags might be returned as a JSON string
        if (typeof tags === 'string') {
          try {
            tags = JSON.parse(tags)
          } catch (err) {
            tags = []
          }
        }
        if (!Array.isArray(tags)) tags = []

        let updated = false
        let newTags = tags.map((t) => {
          if (t === oldTag) {
            updated = true
            return newTag
          }
          return t
        })

        if (updated) {
          // Deduplicate tags
          newTags = [...new Set(newTags)]
          record.set('tags', newTags)
          txApp.saveNoValidate(record)
          count++
        }
      }
    })

    return e.json(200, { success: true, updated: count })
  },
  $apis.requireAuth(),
)
