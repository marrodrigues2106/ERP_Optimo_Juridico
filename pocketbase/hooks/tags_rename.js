routerAdd(
  'POST',
  '/backend/v1/tags/rename',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      throw new UnauthorizedError('Authentication required.')
    }

    const activeOrg = authRecord.getString('active_organization')
    if (!activeOrg) {
      throw new BadRequestError('No active organization found.')
    }

    const body = e.requestInfo().body
    if (!body || typeof body.oldTag !== 'string' || typeof body.newTag !== 'string') {
      throw new BadRequestError('oldTag and newTag must be strings.')
    }

    const oldTag = body.oldTag.trim()
    const newTag = body.newTag.trim()

    if (!oldTag) {
      throw new BadRequestError('oldTag is required.')
    }
    if (!newTag) {
      throw new BadRequestError('newTag is required.')
    }

    try {
      $app.runInTransaction((txApp) => {
        // 1. Update case_labels
        try {
          const label = txApp.findFirstRecordByFilter(
            'case_labels',
            'name = {:oldTag} && organization = {:org}',
            { oldTag: oldTag, org: activeOrg },
          )

          try {
            txApp.findFirstRecordByFilter(
              'case_labels',
              'name = {:newTag} && organization = {:org}',
              { newTag: newTag, org: activeOrg },
            )
            // If the new tag already exists, delete the old tag to prevent UNIQUE constraint failure
            txApp.delete(label)
          } catch (_) {
            // If the new tag doesn't exist, safely rename the old tag
            label.set('name', newTag)
            txApp.save(label)
          }
        } catch (_) {
          // oldTag not found in case_labels, continue to update cases regardless
        }

        // 2. Update legal_cases
        const cases = txApp.findRecordsByFilter(
          'legal_cases',
          'organization = {:org} && tags ~ {:oldTag}',
          '',
          100000,
          0,
          { org: activeOrg, oldTag: oldTag },
        )

        for (let i = 0; i < cases.length; i++) {
          const record = cases[i]
          let tags = record.get('tags')

          if (!tags) continue

          let tagsArray = []
          if (typeof tags === 'string') {
            try {
              tagsArray = JSON.parse(tags)
            } catch (_) {
              continue
            }
          } else if (Array.isArray(tags)) {
            tagsArray = tags
          }

          if (!Array.isArray(tagsArray)) continue

          let changed = false
          const newTagsArray = []

          for (let j = 0; j < tagsArray.length; j++) {
            let t = tagsArray[j]

            // Strict string processing
            if (typeof t !== 'string') {
              changed = true
              continue // Just drop non-strings
            }

            t = t.trim()

            // Drop purely numeric tags
            if (/^\d+$/.test(t)) {
              changed = true
              continue
            }

            if (t === oldTag) {
              changed = true
              newTagsArray.push(newTag)
            } else {
              newTagsArray.push(t)
            }
          }

          if (changed) {
            // Remove duplicates and ensure proper clean strings
            const uniqueTags = []
            for (let j = 0; j < newTagsArray.length; j++) {
              const val = newTagsArray[j]
              if (typeof val === 'string' && val.trim() !== '' && !uniqueTags.includes(val)) {
                uniqueTags.push(val)
              }
            }

            record.set('tags', uniqueTags)
            txApp.save(record)
          }
        }
      })

      try {
        const logCol = $app.findCollectionByNameOrId('system_logs')
        const log = new Record(logCol)
        log.set('level', 'info')
        log.set('module', 'tags_rename')
        log.set('message', 'Etiqueta renomeada com sucesso via API')
        log.set('details', { oldTag, newTag })
        if (activeOrg) log.set('organization', activeOrg)
        log.set('user', authRecord.id)
        $app.saveNoValidate(log)
      } catch (_) {}

      return e.json(200, { success: true })
    } catch (err) {
      try {
        const log = new Record($app.findCollectionByNameOrId('system_logs'))
        log.set('level', 'error')
        log.set('module', 'tags_rename')
        log.set('message', 'Erro ao renomear etiqueta: ' + err.message)
        log.set('details', { oldTag, newTag })
        if (activeOrg) log.set('organization', activeOrg)
        log.set('user', authRecord.id)
        $app.saveNoValidate(log)
      } catch (_) {}

      throw new InternalServerError('Erro interno ao renomear etiqueta.')
    }
  },
  $apis.requireAuth(),
)
