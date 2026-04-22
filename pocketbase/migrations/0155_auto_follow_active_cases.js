migrate(
  (app) => {
    const cases = app.findRecordsByFilter('legal_cases', "lifecycle_status = 'Ativo'", '', 0, 0)
    for (const c of cases) {
      const collabId = c.getString('responsible_collaborator')
      if (!collabId) continue
      try {
        const collab = app.findRecordById('collaborators', collabId)
        const userId = collab.getString('user')
        if (!userId) continue
        const processNumber = c.getString('case_number')
        if (!processNumber) continue

        try {
          app.findFirstRecordByFilter(
            'followed_processes',
            `user_id = '${userId}' && numero_processo = '${processNumber}'`,
          )
        } catch (_) {
          const fpCol = app.findCollectionByNameOrId('followed_processes')
          const rec = new Record(fpCol)
          rec.set('user_id', userId)
          rec.set('numero_processo', processNumber)
          app.saveNoValidate(rec)
        }
      } catch (_) {}
    }
  },
  (app) => {},
)
