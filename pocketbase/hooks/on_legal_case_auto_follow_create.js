onRecordAfterCreateSuccess((e) => {
  const status = e.record.getString('lifecycle_status')
  if (status === 'Ativo') {
    const caseNumber = e.record.getString('case_number')
    const collabId = e.record.getString('responsible_collaborator')
    if (!caseNumber || !collabId) return e.next()

    try {
      const collab = $app.findRecordById('collaborators', collabId)
      const userId = collab.getString('user')
      if (!userId) return e.next()

      try {
        $app.findFirstRecordByFilter(
          'followed_processes',
          `user_id = '${userId}' && numero_processo = '${caseNumber}'`,
        )
      } catch (_) {
        const fpCol = $app.findCollectionByNameOrId('followed_processes')
        const rec = new Record(fpCol)
        rec.set('user_id', userId)
        rec.set('numero_processo', caseNumber)
        $app.saveNoValidate(rec)
      }
    } catch (_) {}
  }
  return e.next()
}, 'legal_cases')
