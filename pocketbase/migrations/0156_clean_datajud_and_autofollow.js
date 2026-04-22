migrate(
  (app) => {
    app.db().newQuery("DELETE FROM case_movements WHERE source = 'DataJud'").execute()

    const cases = app.findRecordsByFilter(
      'legal_cases',
      "lifecycle_status = 'Ativo' && case_number != ''",
      '',
      0,
      0,
    )
    for (const c of cases) {
      const caseNumber = c.getString('case_number')
      const collabId = c.getString('responsible_collaborator')
      if (!collabId) continue

      try {
        const collab = app.findRecordById('collaborators', collabId)
        const userId = collab.getString('user')
        if (userId) {
          try {
            app.findFirstRecordByFilter(
              'followed_processes',
              `user_id = '${userId}' && numero_processo = '${caseNumber}'`,
            )
          } catch (_) {
            const col = app.findCollectionByNameOrId('followed_processes')
            const rec = new Record(col)
            rec.set('user_id', userId)
            rec.set('numero_processo', caseNumber)
            app.saveNoValidate(rec)
          }
        }
      } catch (_) {}
    }
  },
  (app) => {},
)
