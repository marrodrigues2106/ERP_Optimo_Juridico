routerAdd(
  'POST',
  '/backend/v1/tags/delete',
  (e) => {
    const body = e.requestInfo().body
    const tag = body.tag
    if (!tag) {
      throw new BadRequestError('tag is required')
    }

    const cases = $app.findRecordsByFilter('legal_cases', 'tags ~ {:tag}', '-created', 10000, 0, {
      tag: tag,
    })
    let count = 0

    $app.runInTransaction((txApp) => {
      for (let record of cases) {
        let tags = record.get('tags') || []

        if (typeof tags === 'string') {
          try {
            tags = JSON.parse(tags)
          } catch (err) {
            tags = []
          }
        }
        if (!Array.isArray(tags)) tags = []

        const newTags = tags.filter((t) => t !== tag)

        if (newTags.length !== tags.length) {
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
