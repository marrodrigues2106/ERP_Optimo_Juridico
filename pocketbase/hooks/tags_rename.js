routerAdd(
  'POST',
  '/backend/v1/tags/rename',
  (e) => {
    const body = e.requestInfo().body || {}
    const oldTag = (body.oldTag || '').trim()
    const newTag = (body.newTag || '').trim()

    if (!oldTag || !newTag) {
      throw new BadRequestError('Tags inválidas')
    }

    if (oldTag === newTag) {
      return e.json(200, { success: true })
    }

    const orgId = e.auth?.getString('active_organization')
    if (!orgId) {
      throw new ForbiddenError('Organização não definida')
    }

    $app.runInTransaction((txApp) => {
      let foundInLabels = false

      try {
        const oldLabel = txApp.findFirstRecordByFilter(
          'case_labels',
          'name = {:old} && organization = {:org}',
          { old: oldTag, org: orgId },
        )
        foundInLabels = true

        try {
          txApp.findFirstRecordByFilter('case_labels', 'name = {:new} && organization = {:org}', {
            new: newTag,
            org: orgId,
          })
          // newTag already exists, delete oldLabel to merge and avoid unique constraint error
          txApp.delete(oldLabel)
        } catch (_) {
          // newTag doesn't exist, safely rename oldLabel
          oldLabel.set('name', newTag)
          txApp.save(oldLabel)
        }
      } catch (_) {
        // oldTag not found in case_labels, it might still exist inside legal_cases JSON
      }

      const cases = txApp.findRecordsByFilter(
        'legal_cases',
        'tags ?~ {:old} && organization = {:org}',
        '',
        10000,
        0,
        { old: oldTag, org: orgId },
      )

      if (!foundInLabels && cases.length === 0) {
        throw new NotFoundError('A etiqueta informada não foi encontrada.')
      }

      for (const record of cases) {
        let rawTags = record.get('tags')
        let tags = []

        if (Array.isArray(rawTags)) {
          tags = rawTags
        } else if (typeof rawTags === 'string') {
          try {
            tags = JSON.parse(rawTags)
          } catch (err) {}
        }

        if (Array.isArray(tags)) {
          const newTags = tags.map((t) => (t === oldTag ? newTag : t))
          const uniqueTags = [...new Set(newTags)]
          record.set('tags', uniqueTags)
          txApp.save(record)
        }
      }
    })

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
