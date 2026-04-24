routerAdd(
  'POST',
  '/backend/v1/tags/delete',
  (e) => {
    const body = e.requestInfo().body || {}
    const tag = (body.tag || '').trim()

    if (!tag) {
      throw new BadRequestError('Tag inválida')
    }

    const orgId = e.auth?.getString('active_organization')
    if (!orgId) {
      throw new ForbiddenError('Organização não definida')
    }

    $app.runInTransaction((txApp) => {
      try {
        const label = txApp.findFirstRecordByFilter(
          'case_labels',
          'name = {:tag} && organization = {:org}',
          { tag: tag, org: orgId },
        )
        txApp.delete(label)
      } catch (_) {
        // Not found in case_labels, proceed to remove from processes
      }

      const cases = txApp.findRecordsByFilter(
        'legal_cases',
        'tags ?~ {:tag} && organization = {:org}',
        '',
        10000,
        0,
        { tag: tag, org: orgId },
      )

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
          const newTags = tags.filter((t) => t !== tag)
          record.set('tags', newTags)
          txApp.save(record)
        }
      }
    })

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
