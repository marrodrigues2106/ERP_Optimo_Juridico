routerAdd(
  'POST',
  '/backend/v1/tags/rename',
  (e) => {
    const body = e.requestInfo().body || {}
    const oldTag = body.oldTag
    const newTag = body.newTag

    if (!oldTag || !newTag) {
      return e.badRequestError('oldTag and newTag are required')
    }

    const orgId = e.auth?.get('active_organization')
    if (!orgId) {
      return e.badRequestError('No active organization')
    }

    const cases = $app.findRecordsByFilter(
      'legal_cases',
      'organization = {:orgId} && tags ~ {:oldTag}',
      '-created',
      10000,
      0,
      { orgId: orgId, oldTag: oldTag },
    )

    $app.runInTransaction((txApp) => {
      for (const record of cases) {
        let tags = record.get('tags') || []
        if (!Array.isArray(tags)) continue

        let modified = false
        tags = tags.map((t) => {
          if (t === oldTag) {
            modified = true
            return newTag
          }
          return t
        })

        if (modified) {
          const uniqueTags = [...new Set(tags)]
          record.set('tags', uniqueTags)
          txApp.save(record)
        }
      }
    })

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/tags/delete',
  (e) => {
    const body = e.requestInfo().body || {}
    const tag = body.tag

    if (!tag) {
      return e.badRequestError('tag is required')
    }

    const orgId = e.auth?.get('active_organization')
    if (!orgId) {
      return e.badRequestError('No active organization')
    }

    const cases = $app.findRecordsByFilter(
      'legal_cases',
      'organization = {:orgId} && tags ~ {:tag}',
      '-created',
      10000,
      0,
      { orgId: orgId, tag: tag },
    )

    $app.runInTransaction((txApp) => {
      for (const record of cases) {
        let tags = record.get('tags') || []
        if (!Array.isArray(tags)) continue

        const newTags = tags.filter((t) => t !== tag)
        if (newTags.length !== tags.length) {
          record.set('tags', newTags)
          txApp.save(record)
        }
      }
    })

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
